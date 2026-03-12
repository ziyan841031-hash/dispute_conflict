package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.dispute.client.DifyClient;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.dto.DepartmentPushRequest;
import com.example.dispute.dto.DifyInvokeRequest;
import com.example.dispute.entity.CaseDisposalWorkflowRecord;
import com.example.dispute.entity.CaseDynamicTrackingRecord;
import com.example.dispute.mapper.CaseDisposalWorkflowRecordMapper;
import com.example.dispute.mapper.CaseDynamicTrackingRecordMapper;
import com.example.dispute.util.BriefingPdfUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/recommended-department")
public class RecommendedDepartmentController {

    private static final Logger log = LoggerFactory.getLogger(RecommendedDepartmentController.class);
    private static final String STATUS_ACCEPTED = "案件已受理";
    private static final String STATUS_MEDIATING = "案件调解中";
    private static final String STATUS_MEDIATION_SUCCESS = "案件调解成功";
    private static final String STATUS_MEDIATION_FAILURE = "案件调解失败";
    private static final String CONFIRM_TEXT = "确认";
    private static final String EVENT_ACCEPT = "案件受理";
    private static final String EVENT_RECOMMEND = "部门推荐";
    private static final String EVENT_REPLACE = "部门更换";
    private static final String EVENT_PUSH = "案件派送";
    private static final String EVENT_QA = "智能问答";
    private static final String EVENT_SUPERVISE = "案件监督";
    private static final String EXPEDITE_TEXT = "催办";
    private static final String SUPERVISE_TEXT = "督办";
    private static final String RESULT_SUCCESS_TEXT = "成功";
    private static final String RESULT_FAILURE_TEXT = "失败";
    private static final DateTimeFormatter CN_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy年MM月dd日 HH:mm:ss");
    private static final DateTimeFormatter DISPLAY_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final DifyClient difyClient;
    private final DifyController difyController;
    private final CaseDisposalWorkflowRecordMapper caseDisposalWorkflowRecordMapper;
    private final CaseDynamicTrackingRecordMapper caseDynamicTrackingRecordMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${dify.recommended-department-api-key:replace-with-recommended-department-key}")
    private String recommendedDepartmentApiKey;

    @Value("${dify.briefing-api-key:replace-with-briefing-key}")
    private String briefingApiKey;

    @Value("${dify.department-push-reserved-api-key:}")
    private String departmentPushReservedApiKey;

    @Value("${dify.expedite-supervise-api-key:replace-with-expedite-supervise-key}")
    private String expediteSuperviseApiKey;

    @Value("${dify.dispute-mediation-api-key:replace-with-dispute-mediation-key}")
    private String disputeMediationApiKey;

    public RecommendedDepartmentController(DifyClient difyClient,
                                           DifyController difyController,
                                           CaseDisposalWorkflowRecordMapper caseDisposalWorkflowRecordMapper,
                                           CaseDynamicTrackingRecordMapper caseDynamicTrackingRecordMapper) {
        this.difyClient = difyClient;
        this.difyController = difyController;
        this.caseDisposalWorkflowRecordMapper = caseDisposalWorkflowRecordMapper;
        this.caseDynamicTrackingRecordMapper = caseDynamicTrackingRecordMapper;
    }

    @PostMapping("/run")
    public ApiResponse<Object> run(@RequestBody DifyInvokeRequest request) {
        if (request == null || request.getCaseId() == null) {
            throw new IllegalArgumentException("caseId参数不能为空");
        }
        String changeDepartment = safeText(request.getChangeDepartment());
        log.info("recommended department request: caseId={}, query={}, changeDepartment={}",
                request.getCaseId(), request.getQuery(), changeDepartment);

        ensureAcceptanceTraceIfAbsent(request.getCaseId(), resolveCaseSummary(request));

        CaseDisposalWorkflowRecord latestRecord = findLatestRecordByCaseId(request.getCaseId());
        if (latestRecord != null && StringUtils.hasText(latestRecord.getMediationStatus()) && !StringUtils.hasText(changeDepartment)) {
            ensureRecommendedTraceIfAbsent(request.getCaseId(), latestRecord);
            log.info("recommended department hit existing workflow record: caseId={}, mediationStatus={}",
                    request.getCaseId(), latestRecord.getMediationStatus());
            latestRecord.setBriefing(null);
            if(!STATUS_ACCEPTED.equals(latestRecord.getMediationStatus())){
                latestRecord.setRecommendReason(null);
            }

            return ApiResponse.success(latestRecord);
        }

        Object responseData = difyClient.invokeChatMessagesStreaming(request, recommendedDepartmentApiKey);
        CaseDisposalWorkflowRecord record = saveRecommendedDepartmentRecord(request, responseData);
        if (record != null) {
            ensureRecommendedTraceIfAbsent(request.getCaseId(), record);
        }

        if (StringUtils.hasText(changeDepartment)) {
            ensureRecommendedTraceIfAbsent1(request.getCaseId(), record);
        }

        return ApiResponse.success(record == null ? responseData : record);
    }

    @PostMapping("/push")
    public ApiResponse<Object> push(@RequestBody DepartmentPushRequest request) {
        if (request == null || request.getCaseId() == null) {
            throw new IllegalArgumentException("caseId参数不能为空");
        }

        boolean confirmed = isConfirmQuery(request.getQuery());
        boolean mediationResult = !confirmed && isDisputeMediationQuery(request.getQuery());
        boolean expediteSupervise = !confirmed && !mediationResult && isExpediteSuperviseQuery(request.getQuery());
        log.info("department push request: caseId={}, confirmed={}, mediationResult={}, expediteSupervise={}, query={}, currentStage={}",
                request.getCaseId(), confirmed, mediationResult, expediteSupervise, request.getQuery(), request.getCurrentStage());

        CaseDisposalWorkflowRecord latestRecord = findLatestRecordByCaseId(request.getCaseId());
        if (confirmed) {
            Object responseData = invokeBriefingWorkflow(request);
            CaseDisposalWorkflowRecord record = saveDepartmentPushRecord(request, responseData, true);
            CaseDisposalWorkflowRecord responseRecord = record != null ? record : latestRecord;
            if (responseRecord != null) {
                ensurePushTraceIfAbsent(request.getCaseId(), responseRecord);
                return ApiResponse.success(buildPushResponseRecord(responseRecord, true));
            }
            return ApiResponse.success(responseData);
        }

        if (mediationResult) {
            String mediationStatus = resolveDisputeMediationStatus(request.getQuery());
            Map<String, Object> responseData = invokeDisputeMediationWorkflow(request, mediationStatus);
            CaseDisposalWorkflowRecord record = saveDisputeMediationRecord(request, latestRecord, responseData, mediationStatus);
            ensureMediationResultTraceIfAbsent(request.getCaseId(), mediationStatus);
            if (STATUS_MEDIATION_SUCCESS.equals(mediationStatus)) {
                triggerCompleteWorkflowAsync(request.getCaseId());
            }
            return ApiResponse.success(buildDisputeMediationResponseRecord(request, record != null ? record : latestRecord, responseData, mediationStatus));
        }

        if (expediteSupervise) {
            Map<String, Object> responseData = invokeExpediteSuperviseWorkflow(request);
            CaseDisposalWorkflowRecord record = saveExpediteSuperviseRecord(request, latestRecord, responseData);
            String standardReply = extractExpediteStandardReply(responseData);
            String replySummary = extractExpediteReplySummary(responseData);
            insertTrackingRecord(request.getCaseId(), EVENT_SUPERVISE, request.getQuery(), standardReply, replySummary, LocalDateTime.now());
            return ApiResponse.success(buildExpediteSuperviseResponseRecord(request, record != null ? record : latestRecord, responseData));
        }

        Map<String, Object> responseData = invokeReservedDialogueWorkflow(request, latestRecord);
        CaseDisposalWorkflowRecord responseRecord = buildDialogueResponseRecord(request, latestRecord, responseData);
        insertDialogueTrace(request.getCaseId(), request.getQuery(), responseRecord == null ? "" : responseRecord.getBriefing());
        return ApiResponse.success(responseRecord == null ? responseData : responseRecord);
    }

    @GetMapping("/tracking")
    public ApiResponse<List<Map<String, Object>>> listTracking(@RequestParam("caseId") Long caseId) {
        if (caseId == null) {
            throw new IllegalArgumentException("caseId参数不能为空");
        }
        List<CaseDynamicTrackingRecord> records = caseDynamicTrackingRecordMapper.selectList(
                new LambdaQueryWrapper<CaseDynamicTrackingRecord>()
                        .eq(CaseDynamicTrackingRecord::getCaseId, caseId)
                        .orderByDesc(CaseDynamicTrackingRecord::getEventTime)
//                        .orderByAsc(CaseDynamicTrackingRecord::getId)
        );
        List<Map<String, Object>> result = new ArrayList<>();
        for (CaseDynamicTrackingRecord record : records) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", record.getId());
            item.put("caseId", record.getCaseId());
            item.put("question", safeText(record.getQuestion()));
            item.put("answer", safeText(record.getAnswer()));
            item.put("summary", safeText(record.getSummary()));
            item.put("eventSource", safeText(record.getEventSource()));
            item.put("eventTime", formatDisplayDateTime(record.getEventTime()));
            result.add(item);
        }
        return ApiResponse.success(result);
    }

    @GetMapping("/files")
    public ApiResponse<List<Map<String, Object>>> listFiles(@RequestParam("caseId") Long caseId) {
        if (caseId == null) {
            throw new IllegalArgumentException("caseId is required");
        }
        return ApiResponse.success(buildCaseFileItems(findLatestRecordByCaseId(caseId)));
    }

    @GetMapping("/briefing-document/download")
    public ResponseEntity<Resource> downloadBriefingDocument(@RequestParam("path") String rawPath) {
        String value = rawPath == null ? "" : rawPath.trim();
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("path参数不能为空");
        }
        try {
            Path base = Paths.get("generated-docs", "briefings").toAbsolutePath().normalize();
            Path target = Paths.get(value);
            if (!target.isAbsolute()) {
                target = Paths.get(System.getProperty("user.dir")).resolve(target);
            }
            target = target.toAbsolutePath().normalize();
            if (!target.startsWith(base)) {
                throw new IllegalArgumentException("\u975e\u6cd5\u4e0b\u8f7d\u8def\u5f84");
            }
            if (!java.nio.file.Files.exists(target) || !java.nio.file.Files.isRegularFile(target)) {
                throw new IllegalArgumentException("\u6587\u4ef6\u4e0d\u5b58\u5728");
            }
            Resource resource = new FileSystemResource(target);
            String fileName = target.getFileName().toString();
            String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8.name()).replaceAll("\\+", "%20");
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(resource.contentLength())
                    .body(resource);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new RuntimeException("\u4e0b\u8f7d\u6587\u4ef6\u5931\u8d25: " + ex.getMessage(), ex);
        }
    }

    private List<Map<String, Object>> buildCaseFileItems(CaseDisposalWorkflowRecord record) {
        List<Map<String, Object>> items = new ArrayList<>();
        if (record == null) {
            return items;
        }
        addCaseFileItem(items, "briefing", "\u6848\u4ef6\u7b80\u62a5", record.getBriefingDocumentPath(), "/recommended-department/briefing-document/download", resolveCaseFileTime(record.getBriefingGeneratedAt(), record.getDiversionCompletedAt(), record.getCreatedAt()));
        addCaseFileItem(items, "archive-report", "\u5f52\u6863\u62a5\u544a", record.getArchiveReportPath(), "/dify/archive-report/download", resolveCaseFileTime(record.getArchiveReportGeneratedAt(), record.getArchiveCompletedAt(), record.getCreatedAt()));
        addCaseFileItem(items, "archive-document", "\u8c03\u89e3\u534f\u8bae\u4e66", record.getArchiveDocumentPath(), "/dify/archive-document/download", resolveCaseFileTime(record.getMediationDocumentGeneratedAt(), record.getArchiveCompletedAt(), record.getMediationCompletedAt(), record.getCreatedAt()));
        return items;
    }

    private void addCaseFileItem(List<Map<String, Object>> items,
                                 String id,
                                 String title,
                                 String pathValue,
                                 String endpoint,
                                 LocalDateTime generatedAt) {
        String path = safeText(pathValue);
        if (!StringUtils.hasText(path)) {
            return;
        }
        Map<String, Object> item = new HashMap<>();
        item.put("id", id);
        item.put("title", title);
        item.put("fileName", fileNameFromPath(path));
        item.put("path", path);
        item.put("endpoint", endpoint);
        item.put("time", generatedAt);
        item.put("generatedAt", generatedAt);
        items.add(item);
    }

    private LocalDateTime resolveCaseFileTime(LocalDateTime... candidates) {
        if (candidates == null) {
            return null;
        }
        for (LocalDateTime candidate : candidates) {
            if (candidate != null) {
                return candidate;
            }
        }
        return null;
    }

    private String fileNameFromPath(String pathValue) {
        String value = safeText(pathValue);
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String normalized = value.replace('\\', '/');
        int lastSlashIndex = normalized.lastIndexOf('/');
        return lastSlashIndex >= 0 ? normalized.substring(lastSlashIndex + 1) : normalized;
    }

    private Object invokeBriefingWorkflow(DepartmentPushRequest request) {
        return difyClient.runWorkflowWithInputs(buildBriefingInputs(request), briefingApiKey, "\u7b80\u62a5\u751f\u6210");
    }

    private Map<String, Object> invokeReservedDialogueWorkflow(DepartmentPushRequest request, CaseDisposalWorkflowRecord latestRecord) {
        if (!StringUtils.hasText(departmentPushReservedApiKey)
                || departmentPushReservedApiKey.startsWith("replace-with")) {
            log.info("department push reserved workflow not configured, use backend fallback reply");
            return buildLocalDialogueResponse(request, latestRecord);
        }
        Object response = difyClient.runWorkflowWithInputs(buildDialogueInputs(request), departmentPushReservedApiKey, "部门推送预留对话");
        Map<String, Object> responseMap = asMap(response);
        if (StringUtils.hasText(extractDialogueReplyMarkdown(responseMap))) {
            return responseMap;
        }
        log.info("department push reserved workflow returned empty reply, use backend fallback reply");
        return buildLocalDialogueResponse(request, latestRecord);
    }

    private Map<String, Object> buildLocalDialogueResponse(DepartmentPushRequest request, CaseDisposalWorkflowRecord latestRecord) {
        String replyMarkdown = buildLocalDialogueReply(request, latestRecord);
        Map<String, Object> outputs = new HashMap<>();
        outputs.put("reply_markdown", replyMarkdown);
        Map<String, Object> response = new HashMap<>();
        response.put("outputs", outputs);
        response.put("answer", replyMarkdown);
        response.put("source", "backend-fallback");
        return response;
    }

    private String buildLocalDialogueReply(DepartmentPushRequest request, CaseDisposalWorkflowRecord latestRecord) {
        String question = safeText(request == null ? null : request.getQuery());
        String category = safeText(request == null ? null : request.getCaseCategory());
        String riskLevel = safeText(request == null ? null : request.getCaseLevel());
        String currentStage = safeText(request == null ? null : request.getCurrentStage());
        String department = firstText(
                request == null ? null : request.getRecommendedDepartment(),
                latestRecord == null ? null : latestRecord.getRecommendedDepartment(),
                "相关部门"
        );
        String status = firstText(
                latestRecord == null ? null : latestRecord.getMediationStatus(),
                currentStage,
                STATUS_ACCEPTED
        );
        String caseSummary = abbreviateText(safeText(request == null ? null : request.getCaseRawInfo()), 120);
        StringBuilder builder = new StringBuilder();
        builder.append("已通过案件助手接口收到你的问题“").append(question).append("”。\n\n");

        if (question.contains("风险")) {
            builder.append("建议优先关注以下风险点：\n")
                    .append("1. 当前风险等级为“").append(StringUtils.hasText(riskLevel) ? riskLevel : "待核实").append("”，需要持续核验情绪变化和矛盾升级迹象。\n")
                    .append("2. 当前办理阶段为“").append(StringUtils.hasText(currentStage) ? currentStage : status).append("”，建议同步复核最近动态记录和处置节点。\n")
                    .append("3. 若出现催办、冲突升级或脆弱群体权益受影响，应及时发起联动处置。");
        } else if (question.contains("类似案例")) {
            builder.append("可优先从同类纠纷中比对三项内容：\n")
                    .append("1. 纠纷类型“").append(StringUtils.hasText(category) ? category : "当前案件分类").append("”的受理路径和处理时长。\n")
                    .append("2. 相同风险等级案件的调解节奏、沟通话术和留痕方式。\n")
                    .append("3. 是否存在相近争议焦点、相近部门协同路径和类似结果处置经验。");
        } else if (question.contains("法律") || question.contains("依据")) {
            builder.append("建议围绕当前案件先核对以下法律依据方向：\n")
                    .append("1. 纠纷事实是否完整，权利义务关系是否已经明确。\n")
                    .append("2. 与“").append(StringUtils.hasText(category) ? category : "当前纠纷类型").append("”直接相关的法律条文、调解规范和程序要求。\n")
                    .append("3. 当前由“").append(department).append("”跟进时，注意同步保留沟通记录、受理记录和处置依据。");
        } else if (question.contains("时间线") || question.contains("梳理")) {
            builder.append("当前案件可先按以下时间线梳理：\n")
                    .append("1. 案件受理并完成基础信息确认。\n")
                    .append("2. 系统完成部门推荐，当前协同部门为“").append(department).append("”。\n")
                    .append("3. 当前办理状态为“").append(status).append("”，建议结合动态跟踪继续补充最新进展。");
        } else if (question.contains("调解") || question.contains("建议")) {
            builder.append("当前建议优先由“").append(department).append("”跟进，并重点做好以下动作：\n")
                    .append("1. 先确认双方核心争议点和最新诉求变化。\n")
                    .append("2. 结合风险等级安排沟通频次，必要时邀请相关单位协同。\n")
                    .append("3. 形成阶段性记录，便于后续督办、复盘和归档。");
        } else {
            builder.append("结合当前案件信息，建议你优先关注纠纷分类、风险等级、协同部门和最新办理状态，再决定下一步沟通或处置动作。\n")
                    .append("当前协同部门：").append(department).append("；当前状态：").append(status).append("。");
        }

        if (StringUtils.hasText(caseSummary)) {
            builder.append("\n\n案件摘要：").append(caseSummary);
        }
        return builder.toString();
    }

    private String abbreviateText(String text, int maxLength) {
        String value = safeText(text);
        if (!StringUtils.hasText(value) || maxLength <= 0 || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }

    private Map<String, Object> invokeExpediteSuperviseWorkflow(DepartmentPushRequest request) {
        Object response = difyClient.runWorkflowWithInputs(buildExpediteSuperviseInputs(request), expediteSuperviseApiKey, "催办督办");
        return asMap(response);
    }

    private Map<String, Object> invokeDisputeMediationWorkflow(DepartmentPushRequest request, String mediationStatus) {
        Object response = difyClient.runWorkflowWithInputs(buildDisputeMediationInputs(request, mediationStatus), disputeMediationApiKey, "案件调解结果");
        return asMap(response);
    }

    private Map<String, Object> buildBriefingInputs(DepartmentPushRequest request) {
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("case_raw_info", safeText(request.getCaseRawInfo()));
        inputs.put("recommended_department", safeText(request.getRecommendedDepartment()));
        inputs.put("case_category", safeText(request.getCaseCategory()));
        inputs.put("case_level", safeText(request.getCaseLevel()));
        return inputs;
    }

    private Map<String, Object> buildDialogueInputs(DepartmentPushRequest request) {
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("case_info", safeText(request.getCaseRawInfo()));
        inputs.put("current_stage", safeText(request.getCurrentStage()));
        inputs.put("user_question", safeText(request.getQuery()));
        return inputs;
    }

    private Map<String, Object> buildExpediteSuperviseInputs(DepartmentPushRequest request) {
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("case_summary", safeText(request == null ? null : request.getCaseRawInfo()));
        inputs.put("current_time", formatDisplayDateTime(LocalDateTime.now()));
        inputs.put("question", safeText(request == null ? null : request.getQuery()));
        return inputs;
    }

    private Map<String, Object> buildDisputeMediationInputs(DepartmentPushRequest request, String mediationStatus) {
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("case_info", safeText(request == null ? null : request.getCaseRawInfo()));
        inputs.put("mediation_status", StringUtils.hasText(mediationStatus) ? mediationStatus : STATUS_MEDIATION_SUCCESS);
        inputs.put("user_question", safeText(request == null ? null : request.getQuery()));
        return inputs;
    }
    private void ensureAcceptanceTraceIfAbsent(Long caseId, String caseSummary) {
        if (!StringUtils.hasText(caseSummary)) {
            return;
        }
        insertTrackingIfAbsent(caseId, EVENT_ACCEPT, "", caseSummary, caseSummary, LocalDateTime.now());
    }

    private void ensureRecommendedTraceIfAbsent(Long caseId, CaseDisposalWorkflowRecord record) {
        if (record == null) {
            return;
        }
        String answer = safeText(record.getRecommendedDepartment());
        String summary = safeText(record.getRecommendReason());
        if (!StringUtils.hasText(answer) && !StringUtils.hasText(summary)) {
            return;
        }
        insertTrackingIfAbsent(caseId, EVENT_RECOMMEND, "", answer, summary, LocalDateTime.now());
    }

    private void ensureRecommendedTraceIfAbsent1(Long caseId, CaseDisposalWorkflowRecord record) {
        if (record == null) {
            return;
        }
        String answer = safeText(record.getRecommendedDepartment());
        String summary = safeText(record.getRecommendReason());
        if (!StringUtils.hasText(answer) && !StringUtils.hasText(summary)) {
            return;
        }
        insertTrackingRecord(caseId, EVENT_REPLACE, "", answer, summary, LocalDateTime.now());
    }

    private void ensurePushTraceIfAbsent(Long caseId, CaseDisposalWorkflowRecord record) {
        if (record == null || !StringUtils.hasText(record.getBriefing())) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        String answer = "案件已于" + formatChineseDateTime(now) + " 推送至" + safeText(record.getRecommendedDepartment());
        insertTrackingIfAbsent(caseId, EVENT_PUSH, "", answer, safeText(record.getBriefing()), now);
    }

    private void ensureMediationResultTraceIfAbsent(Long caseId, String mediationStatus) {
        String eventSource = resolveMediationResultEventSource(mediationStatus);
        if (caseId == null || !StringUtils.hasText(eventSource)) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        String answer = "案件已于" + formatChineseDateTime(now) + " " + eventSource;
        insertTrackingIfAbsent(caseId, eventSource, "", answer, null, now);
    }

    private String resolveMediationResultEventSource(String mediationStatus) {
        if (STATUS_MEDIATION_SUCCESS.equals(mediationStatus)) {
            return "调解成功";
        }
        if (STATUS_MEDIATION_FAILURE.equals(mediationStatus)) {
            return "调解失败";
        }
        return "";
    }

    private void insertDialogueTrace(Long caseId, String question, String briefingText) {
        if (caseId == null || !StringUtils.hasText(question)) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        CaseDynamicTrackingRecord record = new CaseDynamicTrackingRecord();
        record.setCaseId(caseId);
        record.setQuestion(safeText(question));
        record.setAnswer("\u7528\u6237\u5728" + formatChineseDateTime(now) + "\u53d1\u8d77\u667a\u80fd\u95ee\u7b54");
        record.setSummary(safeText(briefingText));
        record.setEventSource(EVENT_QA);
        record.setEventTime(now);
        caseDynamicTrackingRecordMapper.insert(record);
    }

    private void insertTrackingRecord(Long caseId,
                                      String eventSource,
                                      String question,
                                      String answer,
                                      String summary,
                                      LocalDateTime eventTime) {
        if (caseId == null || !StringUtils.hasText(eventSource)) {
            return;
        }
        CaseDynamicTrackingRecord record = new CaseDynamicTrackingRecord();
        record.setCaseId(caseId);
        record.setQuestion(safeText(question));
        record.setAnswer(safeText(answer));
        record.setSummary(StringUtils.hasText(summary) ? summary.trim() : null);
        record.setEventSource(eventSource);
        record.setEventTime(eventTime == null ? LocalDateTime.now() : eventTime);
        caseDynamicTrackingRecordMapper.insert(record);
    }

    private void insertTrackingIfAbsent(Long caseId,
                                        String eventSource,
                                        String question,
                                        String answer,
                                        String summary,
                                        LocalDateTime eventTime) {
        if (caseId == null || !StringUtils.hasText(eventSource)) {
            return;
        }
        Long count = caseDynamicTrackingRecordMapper.selectCount(
                new LambdaQueryWrapper<CaseDynamicTrackingRecord>()
                        .eq(CaseDynamicTrackingRecord::getCaseId, caseId)
                        .eq(CaseDynamicTrackingRecord::getEventSource, eventSource)
        );
        if (count != null && count > 0) {
            return;
        }
        insertTrackingRecord(caseId, eventSource, question, answer, summary, eventTime);
    }

    private CaseDisposalWorkflowRecord findLatestRecordByCaseId(Long caseId) {
        if (caseId == null) {
            return null;
        }
        return caseDisposalWorkflowRecordMapper.selectOne(
                new LambdaQueryWrapper<CaseDisposalWorkflowRecord>()
                        .eq(CaseDisposalWorkflowRecord::getCaseId, caseId)
                        .orderByDesc(CaseDisposalWorkflowRecord::getCreatedAt)
                        .last("limit 1")
        );
    }

    private CaseDisposalWorkflowRecord saveRecommendedDepartmentRecord(DifyInvokeRequest request, Object responseObj) {
        Long caseId = request == null ? null : request.getCaseId();
        if (caseId == null || responseObj == null) {
            return null;
        }
        String changeDepartment = safeText(request.getChangeDepartment());
        try {
            Map<String, Object> response = asMap(responseObj);
            Map<String, Object> answerMap = parseAnswerMap(response.get("answer"));
            Map<String, Object> flowMap = parseMap(answerMap.get("dispute_flow_nodes"));
            List<Object> ruleHints = parseList(answerMap.get("rule_hints_hit"));

            CaseDisposalWorkflowRecord record = initOrLoadRecord(caseId);
            record.setTaskId(toStringValue(firstNonNull(response.get("task_id"), record.getTaskId())));
            record.setMessageId(toStringValue(firstNonNull(firstNonNull(response.get("message_id"), response.get("id")), record.getMessageId())));
            record.setConversationId(toStringValue(firstNonNull(response.get("conversation_id"), record.getConversationId())));
            record.setRecommendedDepartment(firstText(answerMap.get("recommended_department"), changeDepartment, record.getRecommendedDepartment()));
            record.setRecommendedMediationType(firstText(answerMap.get("recommended_mediation_type"), record.getRecommendedMediationType()));
            record.setRecommendReason(firstText(
                    answerMap.get("markdown_message"),
                    answerMap.get("recommendReason"),
                    answerMap.get("recommend_reason"),
                    answerMap.get("answer"),
                    response.get("answer"),
                    record.getRecommendReason()
            ));
            record.setBackupSuggestion(firstText(answerMap.get("backup_suggestion"), record.getBackupSuggestion()));
            record.setRuleHintsHit(ruleHints == null ? null : objectMapper.writeValueAsString(ruleHints));
            record.setFlowLevel1(firstText(flowMap.get("level1"), record.getFlowLevel1()));
            record.setFlowLevel2(firstText(flowMap.get("level2"), record.getFlowLevel2()));
            record.setFlowLevel3(firstText(flowMap.get("level3"), record.getFlowLevel3()));
            record.setMediationStatus(resolveMediationStatus(answerMap));
            record.setRawResponse(objectMapper.writeValueAsString(response));
            saveRecord(record);
            return record;
        } catch (Exception ex) {
            log.warn("recommended department save workflow record failed: {}", ex.getMessage(), ex);
            return null;
        }
    }

    private CaseDisposalWorkflowRecord saveDepartmentPushRecord(DepartmentPushRequest request, Object responseObj, boolean confirmed) {
        if (request == null || request.getCaseId() == null) {
            return null;
        }
        try {
            Map<String, Object> response = asMap(responseObj);
            Map<String, Object> outputs = parseMap(response.get("outputs"));
            String briefingRaw = firstText(
                    outputs.get("brief_markdown"),
                    outputs.get("briefing"),
                    outputs.get("markdown"),
                    outputs.get("answer")
            );

            CaseDisposalWorkflowRecord record = initOrLoadRecord(request.getCaseId());
            if (StringUtils.hasText(request.getRecommendedDepartment())) {
                record.setRecommendedDepartment(request.getRecommendedDepartment().trim());
            }
            if (StringUtils.hasText(briefingRaw)) {
                record.setBriefing(briefingRaw);
                String s = generateBriefingDocument(record.getCaseId(), record.getRecommendedDepartment(), briefingRaw);
                log.info("简报文件生成返回：{}",s);
                record.setBriefingDocumentPath(s);
                if (StringUtils.hasText(s)) {
                    record.setBriefingGeneratedAt(LocalDateTime.now());
                }
            }
            if (confirmed) {
                record.setMediationStatus(STATUS_MEDIATING);
                record.setDiversionCompletedAt(LocalDateTime.now());
                record.setMediationCompletedAt(null);
            }
            if (!response.isEmpty()) {
                record.setRawResponse(objectMapper.writeValueAsString(response));
            }
            saveRecord(record);
            return record;
        } catch (Exception ex) {
            log.warn("department push save workflow record failed: {}", ex.getMessage(), ex);
            return null;
        }
    }

    private CaseDisposalWorkflowRecord buildDialogueResponseRecord(DepartmentPushRequest request,
                                                                   CaseDisposalWorkflowRecord latestRecord,
                                                                   Map<String, Object> responseData) {
        CaseDisposalWorkflowRecord responseRecord = new CaseDisposalWorkflowRecord();
        if (latestRecord != null) {
            BeanUtils.copyProperties(latestRecord, responseRecord);
        }
        responseRecord.setCaseId(request.getCaseId());
        if (StringUtils.hasText(request.getRecommendedDepartment())) {
            responseRecord.setRecommendedDepartment(request.getRecommendedDepartment().trim());
        }
        if (!StringUtils.hasText(responseRecord.getMediationStatus())) {
            responseRecord.setMediationStatus(STATUS_ACCEPTED);
        }
        responseRecord.setBriefing(extractDialogueReplyMarkdown(responseData));
        if (responseData != null && !responseData.isEmpty()) {
            try {
                responseRecord.setRawResponse(objectMapper.writeValueAsString(responseData));
            } catch (Exception ex) {
                log.warn("build dialogue response rawResponse failed: {}", ex.getMessage());
            }
        }
        return responseRecord;
    }

    private CaseDisposalWorkflowRecord saveExpediteSuperviseRecord(DepartmentPushRequest request,
                                                                   CaseDisposalWorkflowRecord latestRecord,
                                                                   Map<String, Object> responseData) {
        if (request == null || request.getCaseId() == null) {
            return null;
        }
        try {
            CaseDisposalWorkflowRecord record = latestRecord != null ? latestRecord : initOrLoadRecord(request.getCaseId());
            if (record.getCreatedAt() == null) {
                record.setCreatedAt(LocalDateTime.now());
            }
            if (StringUtils.hasText(request.getRecommendedDepartment())) {
                record.setRecommendedDepartment(request.getRecommendedDepartment().trim());
            }
            record.setExpediteSuperviseStatus(1);
            if (responseData != null && !responseData.isEmpty()) {
                record.setRawResponse(objectMapper.writeValueAsString(responseData));
            }
            saveRecord(record);
            return record;
        } catch (Exception ex) {
            log.warn("expedite supervise save workflow record failed: {}", ex.getMessage(), ex);
            return null;
        }
    }

    private CaseDisposalWorkflowRecord saveDisputeMediationRecord(DepartmentPushRequest request,
                                                                  CaseDisposalWorkflowRecord latestRecord,
                                                                  Map<String, Object> responseData,
                                                                  String mediationStatus) {
        if (request == null || request.getCaseId() == null) {
            return null;
        }
        try {
            CaseDisposalWorkflowRecord record = latestRecord != null ? latestRecord : initOrLoadRecord(request.getCaseId());
            if (record.getCreatedAt() == null) {
                record.setCreatedAt(LocalDateTime.now());
            }
            if (StringUtils.hasText(request.getRecommendedDepartment())) {
                record.setRecommendedDepartment(request.getRecommendedDepartment().trim());
            }
            String resultText = extractDisputeMediationResult(responseData);
            if (StringUtils.hasText(resultText)) {
                record.setBriefing(resultText);
            }
            record.setMediationStatus(StringUtils.hasText(mediationStatus) ? mediationStatus : record.getMediationStatus());
            record.setMediationCompletedAt(LocalDateTime.now());
            if (responseData != null && !responseData.isEmpty()) {
                record.setRawResponse(objectMapper.writeValueAsString(responseData));
            }
            saveRecord(record);
            return record;
        } catch (Exception ex) {
            log.warn("dispute mediation save workflow record failed: {}", ex.getMessage(), ex);
            return null;
        }
    }

    private CaseDisposalWorkflowRecord buildExpediteSuperviseResponseRecord(DepartmentPushRequest request,
                                                                            CaseDisposalWorkflowRecord latestRecord,
                                                                            Map<String, Object> responseData) {
        CaseDisposalWorkflowRecord responseRecord = new CaseDisposalWorkflowRecord();
        if (latestRecord != null) {
            BeanUtils.copyProperties(latestRecord, responseRecord);
        }
        if (request != null) {
            responseRecord.setCaseId(request.getCaseId());
            if (StringUtils.hasText(request.getRecommendedDepartment())) {
                responseRecord.setRecommendedDepartment(request.getRecommendedDepartment().trim());
            }
        }
        responseRecord.setExpediteSuperviseStatus(1);
        String standardReply = extractExpediteStandardReply(responseData);
        if (StringUtils.hasText(standardReply)) {
            responseRecord.setBriefing(standardReply);
        }
        return responseRecord;
    }

    private CaseDisposalWorkflowRecord buildDisputeMediationResponseRecord(DepartmentPushRequest request,
                                                                           CaseDisposalWorkflowRecord latestRecord,
                                                                           Map<String, Object> responseData,
                                                                           String mediationStatus) {
        CaseDisposalWorkflowRecord responseRecord = new CaseDisposalWorkflowRecord();
        if (latestRecord != null) {
            BeanUtils.copyProperties(latestRecord, responseRecord);
        }
        if (request != null) {
            responseRecord.setCaseId(request.getCaseId());
            if (StringUtils.hasText(request.getRecommendedDepartment())) {
                responseRecord.setRecommendedDepartment(request.getRecommendedDepartment().trim());
            }
        }
        responseRecord.setMediationStatus(StringUtils.hasText(mediationStatus) ? mediationStatus : responseRecord.getMediationStatus());
        responseRecord.setMediationCompletedAt(LocalDateTime.now());
        String resultText = extractDisputeMediationResult(responseData);
        if (StringUtils.hasText(resultText)) {
            responseRecord.setBriefing(resultText);
        }
        return responseRecord;
    }

    private String extractExpediteStandardReply(Map<String, Object> responseData) {
        Map<String, Object> outputs = parseMap(responseData == null ? null : responseData.get("outputs"));
        return firstText(
                outputs.get("standard_reply"),
                outputs.get("standardReply"),
                outputs.get("answer"),
                responseData == null ? null : responseData.get("answer")
        );
    }

    private String extractExpediteReplySummary(Map<String, Object> responseData) {
        Map<String, Object> outputs = parseMap(responseData == null ? null : responseData.get("outputs"));
        return firstText(
                outputs.get("reply_summary"),
                outputs.get("replySummary"),
                outputs.get("summary")
        );
    }

    private String extractDisputeMediationResult(Map<String, Object> responseData) {
        Map<String, Object> outputs = parseMap(responseData == null ? null : responseData.get("outputs"));
        return firstText(
                outputs.get("result"),
                outputs.get("answer"),
                responseData == null ? null : responseData.get("answer")
        );
    }

    private String extractDialogueReplyMarkdown(Map<String, Object> responseData) {
        Map<String, Object> outputs = parseMap(responseData == null ? null : responseData.get("outputs"));
        return firstText(
                outputs.get("reply_markdown"),
                outputs.get("replyMarkdown"),
                outputs.get("markdown_message"),
                outputs.get("answer"),
                responseData == null ? null : responseData.get("answer")
        );
    }

    private String generateBriefingDocument(Long caseId, String recommendedDepartment, String briefingRaw) {
        try {
            return BriefingPdfUtil.generateBriefingPdfPath(caseId, recommendedDepartment, briefingRaw);
        } catch (Exception ex) {
            log.info("简报异常："+ ex);
            log.warn("generate briefing pdf failed: {}", ex.getMessage(), ex);
            return "";
        }
    }

    private CaseDisposalWorkflowRecord buildPushResponseRecord(CaseDisposalWorkflowRecord record, boolean confirmed) {
        if (record == null) {
            return null;
        }
        CaseDisposalWorkflowRecord responseRecord = new CaseDisposalWorkflowRecord();
        BeanUtils.copyProperties(record, responseRecord);
        if (confirmed) {
            responseRecord.setBriefing(buildResponseBriefing(responseRecord.getRecommendedDepartment(), responseRecord.getBriefing()));
        }
        return responseRecord;
    }

    private String buildResponseBriefing(String recommendedDepartment, String briefingRaw) {
        String department = StringUtils.hasText(recommendedDepartment) ? recommendedDepartment.trim() : "\u76f8\u5173";
        String prefix = "\u6211\u5df2\u6210\u529f\u628a\u6848\u4ef6\u63a8\u9001\u81f3 " + department + " \u90e8\u95e8\uff0c\u5e76\u751f\u6210\u4e86\u6848\u4ef6\u7b80\u62a5\u5e2e\u52a9\u8c03\u89e3\u4eba\u5458\u8fc5\u901f\u638c\u63e1\u6848\u4ef6\u4fe1\u606f\u3002";
        if (!StringUtils.hasText(briefingRaw)) {
            return prefix;
        }
        return prefix + "\n" + briefingRaw.trim();
    }

    private boolean isConfirmQuery(String query) {
        return CONFIRM_TEXT.equals(toStringValue(query));
    }

    private boolean isExpediteSuperviseQuery(String query) {
        String text = toStringValue(query);
        return text.contains(EXPEDITE_TEXT) || text.contains(SUPERVISE_TEXT);
    }

    private boolean isDisputeMediationQuery(String query) {
        String text = toStringValue(query);
        return text.contains(RESULT_SUCCESS_TEXT) || text.contains(RESULT_FAILURE_TEXT);
    }

    private String resolveDisputeMediationStatus(String query) {
        String text = toStringValue(query);
        int successIndex = text.indexOf(RESULT_SUCCESS_TEXT);
        int failureIndex = text.indexOf(RESULT_FAILURE_TEXT);
        if (successIndex < 0 && failureIndex < 0) {
            return STATUS_MEDIATION_SUCCESS;
        }
        if (successIndex < 0) {
            return STATUS_MEDIATION_FAILURE;
        }
        if (failureIndex < 0) {
            return STATUS_MEDIATION_SUCCESS;
        }
        return successIndex <= failureIndex ? STATUS_MEDIATION_SUCCESS : STATUS_MEDIATION_FAILURE;
    }

    private void triggerCompleteWorkflowAsync(Long caseId) {
        if (caseId == null) {
            return;
        }
        CompletableFuture.runAsync(() -> {
            try {
                DifyInvokeRequest request = new DifyInvokeRequest();
                request.setCaseId(caseId);
                difyController.completeWorkflow(request);
            } catch (Exception ex) {
                log.warn("trigger complete workflow async failed: {}", ex.getMessage(), ex);
            }
        });
    }

    private String resolveCaseSummary(DifyInvokeRequest request) {
        if (request == null) {
            return "";
        }
        String caseSummary = safeText(request.getCaseSummary());
        if (StringUtils.hasText(caseSummary)) {
            return caseSummary;
        }
        Map<String, Object> variables = request.getVariables();
        if (variables == null || variables.isEmpty()) {
            return "";
        }
        return firstText(variables.get("case_summary"), variables.get("dispute_text"));
    }

    private CaseDisposalWorkflowRecord initOrLoadRecord(Long caseId) {
        CaseDisposalWorkflowRecord record = findLatestRecordByCaseId(caseId);
        if (record != null) {
            if (record.getCreatedAt() == null) {
                record.setCreatedAt(LocalDateTime.now());
            }
            if (record.getExpediteSuperviseStatus() == null) {
                record.setExpediteSuperviseStatus(0);
            }
            return record;
        }
        record = new CaseDisposalWorkflowRecord();
        record.setCaseId(caseId);
        record.setCreatedAt(LocalDateTime.now());
        record.setExpediteSuperviseStatus(0);
        return record;
    }

    private void saveRecord(CaseDisposalWorkflowRecord record) {
        if (record.getId() == null) {
            caseDisposalWorkflowRecordMapper.insert(record);
            return;
        }
        caseDisposalWorkflowRecordMapper.updateById(record);
    }

    private Map<String, Object> asMap(Object value) {
        if (value == null) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.convertValue(value, new TypeReference<Map<String, Object>>() {});
        } catch (IllegalArgumentException ex) {
            return Collections.emptyMap();
        }
    }

    private Map<String, Object> parseAnswerMap(Object answerObj) {
        if (answerObj == null) {
            return Collections.emptyMap();
        }
        try {
            String answerText = String.valueOf(answerObj).trim();
            if (!StringUtils.hasText(answerText)) {
                return Collections.emptyMap();
            }
            return objectMapper.readValue(answerText, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }

    private Map<String, Object> parseMap(Object value) {
        if (value == null) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.convertValue(value, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }

    private List<Object> parseList(Object value) {
        if (value == null) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.convertValue(value, new TypeReference<List<Object>>() {});
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    private String resolveMediationStatus(Map<String, Object> answerMap) {
        String directStatus = toStringValue(answerMap.get("mediation_status"));
        if (StringUtils.hasText(directStatus)) {
            return directStatus;
        }
        String recommendedDepartment = toStringValue(answerMap.get("recommended_department"));
        return StringUtils.hasText(recommendedDepartment) ? STATUS_ACCEPTED : "";
    }

    private String firstText(Object... values) {
        if (values == null) {
            return "";
        }
        for (Object value : values) {
            String text = toStringValue(value);
            if (StringUtils.hasText(text)) {
                return text;
            }
        }
        return "";
    }

    private Object firstNonNull(Object first, Object second) {
        return first != null ? first : second;
    }

    private String toStringValue(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value).trim();
        return StringUtils.hasText(text) ? text : "";
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private String formatChineseDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "";
        }
        return dateTime.format(CN_DATETIME_FORMATTER);
    }

    private String formatDisplayDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "";
        }
        return dateTime.format(DISPLAY_DATETIME_FORMATTER);
    }
}


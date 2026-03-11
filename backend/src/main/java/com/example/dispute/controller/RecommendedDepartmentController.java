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

@RestController
@RequestMapping("/api/recommended-department")
public class RecommendedDepartmentController {

    private static final Logger log = LoggerFactory.getLogger(RecommendedDepartmentController.class);
    private static final String STATUS_ACCEPTED = "案件已受理";
    private static final String STATUS_MEDIATING = "案件调解中";
    private static final String CONFIRM_TEXT = "确认";
    private static final String EVENT_ACCEPT = "案件受理";
    private static final String EVENT_RECOMMEND = "部门推荐";
    private static final String EVENT_PUSH = "案件推送";
    private static final String EVENT_QA = "智能问答";
    private static final DateTimeFormatter CN_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy年MM月dd日 HH:mm:ss");
    private static final DateTimeFormatter DISPLAY_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final DifyClient difyClient;
    private final CaseDisposalWorkflowRecordMapper caseDisposalWorkflowRecordMapper;
    private final CaseDynamicTrackingRecordMapper caseDynamicTrackingRecordMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${dify.recommended-department-api-key:replace-with-recommended-department-key}")
    private String recommendedDepartmentApiKey;

    @Value("${dify.briefing-api-key:replace-with-briefing-key}")
    private String briefingApiKey;

    @Value("${dify.department-push-reserved-api-key:}")
    private String departmentPushReservedApiKey;

    public RecommendedDepartmentController(DifyClient difyClient,
                                           CaseDisposalWorkflowRecordMapper caseDisposalWorkflowRecordMapper,
                                           CaseDynamicTrackingRecordMapper caseDynamicTrackingRecordMapper) {
        this.difyClient = difyClient;
        this.caseDisposalWorkflowRecordMapper = caseDisposalWorkflowRecordMapper;
        this.caseDynamicTrackingRecordMapper = caseDynamicTrackingRecordMapper;
    }

    @PostMapping("/run")
    public ApiResponse<Object> run(@RequestBody DifyInvokeRequest request) {
        if (request == null || request.getCaseId() == null) {
            throw new IllegalArgumentException("caseId不能为空");
        }
        log.info("recommended department request: caseId={}, query={}", request.getCaseId(), request.getQuery());

        ensureAcceptanceTraceIfAbsent(request.getCaseId(), resolveCaseSummary(request));

        CaseDisposalWorkflowRecord latestRecord = findLatestRecordByCaseId(request.getCaseId());
        if (latestRecord != null && StringUtils.hasText(latestRecord.getMediationStatus())) {
            ensureRecommendedTraceIfAbsent(request.getCaseId(), latestRecord);
            log.info("recommended department hit existing workflow record: caseId={}, mediationStatus={}",
                    request.getCaseId(), latestRecord.getMediationStatus());
            return ApiResponse.success(latestRecord);
        }

        Object responseData = difyClient.invokeChatMessagesStreaming(request, recommendedDepartmentApiKey);
        CaseDisposalWorkflowRecord record = saveRecommendedDepartmentRecord(request.getCaseId(), responseData);
        if (record != null) {
            ensureRecommendedTraceIfAbsent(request.getCaseId(), record);
        }
        return ApiResponse.success(record == null ? responseData : record);
    }

    @PostMapping("/push")
    public ApiResponse<Object> push(@RequestBody DepartmentPushRequest request) {
        if (request == null || request.getCaseId() == null) {
            throw new IllegalArgumentException("caseId不能为空");
        }

        boolean confirmed = isConfirmQuery(request.getQuery());
        log.info("department push request: caseId={}, confirmed={}, query={}, currentStage={}",
                request.getCaseId(), confirmed, request.getQuery(), request.getCurrentStage());

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

        Map<String, Object> responseData = invokeReservedDialogueWorkflow(request);
        CaseDisposalWorkflowRecord responseRecord = buildDialogueResponseRecord(request, latestRecord, responseData);
        insertDialogueTrace(request.getCaseId(), request.getQuery(), responseRecord == null ? "" : responseRecord.getBriefing());
        return ApiResponse.success(responseRecord == null ? responseData : responseRecord);
    }

    @GetMapping("/tracking")
    public ApiResponse<List<Map<String, Object>>> listTracking(@RequestParam("caseId") Long caseId) {
        if (caseId == null) {
            throw new IllegalArgumentException("caseId不能为空");
        }
        List<CaseDynamicTrackingRecord> records = caseDynamicTrackingRecordMapper.selectList(
                new LambdaQueryWrapper<CaseDynamicTrackingRecord>()
                        .eq(CaseDynamicTrackingRecord::getCaseId, caseId)
                        .orderByAsc(CaseDynamicTrackingRecord::getEventTime)
                        .orderByAsc(CaseDynamicTrackingRecord::getId)
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

    @GetMapping("/briefing-document/download")
    public ResponseEntity<Resource> downloadBriefingDocument(@RequestParam("path") String rawPath) {
        String value = rawPath == null ? "" : rawPath.trim();
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("path不能为空");
        }
        try {
            Path base = Paths.get("generated-docs", "briefings").toAbsolutePath().normalize();
            Path target = Paths.get(value);
            if (!target.isAbsolute()) {
                target = Paths.get(System.getProperty("user.dir")).resolve(target);
            }
            target = target.toAbsolutePath().normalize();
            if (!target.startsWith(base)) {
                throw new IllegalArgumentException("非法下载路径");
            }
            if (!java.nio.file.Files.exists(target) || !java.nio.file.Files.isRegularFile(target)) {
                throw new IllegalArgumentException("文件不存在");
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
            throw new RuntimeException("下载文件失败: " + ex.getMessage(), ex);
        }
    }

    private Object invokeBriefingWorkflow(DepartmentPushRequest request) {
        return difyClient.runWorkflowWithInputs(buildBriefingInputs(request), briefingApiKey, "简报");
    }

    private Map<String, Object> invokeReservedDialogueWorkflow(DepartmentPushRequest request) {
        if (!StringUtils.hasText(departmentPushReservedApiKey)
                || departmentPushReservedApiKey.startsWith("replace-with")) {
            log.info("department push reserved workflow not configured, skip remote invocation");
            return Collections.emptyMap();
        }
        Object response = difyClient.runWorkflowWithInputs(buildDialogueInputs(request), departmentPushReservedApiKey, "正常对话");
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

    private void ensurePushTraceIfAbsent(Long caseId, CaseDisposalWorkflowRecord record) {
        if (record == null || !StringUtils.hasText(record.getBriefing())) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        String answer = "在" + formatChineseDateTime(now) + "向" + safeText(record.getRecommendedDepartment()) + "派单";
        insertTrackingIfAbsent(caseId, EVENT_PUSH, "", answer, safeText(record.getBriefing()), now);
    }

    private void insertDialogueTrace(Long caseId, String question, String briefingText) {
        if (caseId == null || !StringUtils.hasText(question)) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        CaseDynamicTrackingRecord record = new CaseDynamicTrackingRecord();
        record.setCaseId(caseId);
        record.setQuestion(safeText(question));
        record.setAnswer("用户在" + formatChineseDateTime(now) + "发起智能问答");
        record.setSummary(safeText(briefingText));
        record.setEventSource(EVENT_QA);
        record.setEventTime(now);
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
        CaseDynamicTrackingRecord record = new CaseDynamicTrackingRecord();
        record.setCaseId(caseId);
        record.setQuestion(safeText(question));
        record.setAnswer(safeText(answer));
        record.setSummary(safeText(summary));
        record.setEventSource(eventSource);
        record.setEventTime(eventTime == null ? LocalDateTime.now() : eventTime);
        caseDynamicTrackingRecordMapper.insert(record);
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

    private CaseDisposalWorkflowRecord saveRecommendedDepartmentRecord(Long caseId, Object responseObj) {
        if (caseId == null || responseObj == null) {
            return null;
        }
        try {
            Map<String, Object> response = asMap(responseObj);
            Map<String, Object> answerMap = parseAnswerMap(response.get("answer"));
            Map<String, Object> flowMap = parseMap(answerMap.get("dispute_flow_nodes"));
            List<Object> ruleHints = parseList(answerMap.get("rule_hints_hit"));

            CaseDisposalWorkflowRecord record = initOrLoadRecord(caseId);
            record.setTaskId(toStringValue(firstNonNull(response.get("task_id"), record.getTaskId())));
            record.setMessageId(toStringValue(firstNonNull(firstNonNull(response.get("message_id"), response.get("id")), record.getMessageId())));
            record.setConversationId(toStringValue(firstNonNull(response.get("conversation_id"), record.getConversationId())));
            record.setRecommendedDepartment(firstText(answerMap.get("recommended_department"), record.getRecommendedDepartment()));
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
                record.setBriefingDocumentPath(generateBriefingDocument(record.getCaseId(), record.getRecommendedDepartment(), briefingRaw));
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
        String replyMarkdown = extractDialogueReplyMarkdown(responseData);
        responseRecord.setBriefing(replyMarkdown);
        if (responseData != null && !responseData.isEmpty()) {
            try {
                responseRecord.setRawResponse(objectMapper.writeValueAsString(responseData));
            } catch (Exception ex) {
                log.warn("build dialogue response rawResponse failed: {}", ex.getMessage());
            }
        }
        return responseRecord;
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
        String department = StringUtils.hasText(recommendedDepartment) ? recommendedDepartment.trim() : "相关";
        String prefix = "我已成功把案件推送至 " + department + " 部门，并生成了案件简报帮助调解人员迅速掌握案件信息。";
        if (!StringUtils.hasText(briefingRaw)) {
            return prefix;
        }
        return prefix + "\n" + briefingRaw.trim();
    }

    private boolean isConfirmQuery(String query) {
        return CONFIRM_TEXT.equals(toStringValue(query));
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
            return record;
        }
        record = new CaseDisposalWorkflowRecord();
        record.setCaseId(caseId);
        record.setCreatedAt(LocalDateTime.now());
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

package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.dto.CaseQueryRequest;
import com.example.dispute.dto.TextIngestRequest;
import com.example.dispute.entity.CaseClassifyRecord;
import com.example.dispute.entity.CaseDisposalWorkflowRecord;
import com.example.dispute.entity.CaseOptimizationFeedback;
import com.example.dispute.entity.CaseRecord;
import com.example.dispute.mapper.CaseClassifyRecordMapper;
import com.example.dispute.mapper.CaseDisposalWorkflowRecordMapper;
import com.example.dispute.mapper.CaseOptimizationFeedbackMapper;
import com.example.dispute.mapper.CaseRecordMapper;
import com.example.dispute.service.CaseRecordService;
import com.example.dispute.client.DifyClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.validation.annotation.Validated;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import javax.validation.Valid;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

/**
 * 案件控制器。
 */
@RestController // 声明为REST控制器。
@RequestMapping("/api/cases") // 定义案件接口根路径。
@Validated // 启用参数校验。
public class CaseController {

    // 定义日志对象。
    private static final Logger log = LoggerFactory.getLogger(CaseController.class);
    // 定义案件服务对象。
    private final CaseRecordService caseRecordService;
    // 定义案件Mapper对象。
    private final CaseRecordMapper caseRecordMapper;
    // 定义分类Mapper对象。
    private final CaseClassifyRecordMapper caseClassifyRecordMapper;
    // 定义纠纷处置工作流Mapper对象。
    private final CaseDisposalWorkflowRecordMapper caseDisposalWorkflowRecordMapper;
    // 定义优化建议Mapper对象。
    private final CaseOptimizationFeedbackMapper caseOptimizationFeedbackMapper;
    // 定义Dify客户端。
    private final DifyClient difyClient;

    @Value("${dify.correction-api-key:replace-with-correction-key}")
    private String correctionApiKey;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * 构造函数。
     */
    public CaseController(CaseRecordService caseRecordService, CaseRecordMapper caseRecordMapper,
                          CaseClassifyRecordMapper caseClassifyRecordMapper,
                          CaseDisposalWorkflowRecordMapper caseDisposalWorkflowRecordMapper,
                          CaseOptimizationFeedbackMapper caseOptimizationFeedbackMapper,
                          DifyClient difyClient) {
        // 注入案件服务。
        this.caseRecordService = caseRecordService;
        // 注入案件Mapper。
        this.caseRecordMapper = caseRecordMapper;
        // 注入分类Mapper。
        this.caseClassifyRecordMapper = caseClassifyRecordMapper;
        // 注入工作流Mapper。
        this.caseDisposalWorkflowRecordMapper = caseDisposalWorkflowRecordMapper;
        // 注入优化建议Mapper。
        this.caseOptimizationFeedbackMapper = caseOptimizationFeedbackMapper;
        // 注入Dify客户端。
        this.difyClient = difyClient;
    }

    /**
     * 处理文字案件入库。
     */
    @PostMapping("/ingest/text") // 定义文字入库接口。
    public ApiResponse<CaseRecord> ingestText(@Valid @RequestBody TextIngestRequest request) {
        // 计算文本长度。
        int textLength = request.getCaseText() == null ? 0 : request.getCaseText().length();
        // 生成文本预览。
        String preview = buildCaseTextPreview(request.getCaseText());
        // 打印请求参数日志。
        log.info("文字入库请求: textLength={}, preview={}, eventSource={}", textLength, preview, request.getEventSource());
        // 调用服务执行入库。
        CaseRecord record = caseRecordService.ingestText(request);
        // 打印响应结果日志。
        log.info("文字入库响应: caseNo={}", record.getCaseNo());
        // 返回统一成功响应。
        return ApiResponse.success(record);
    }



    /**
     * 处理智能分类接口。
     */
    @PostMapping("/intelligent-classify") // 定义智能分类接口。
    public ApiResponse<Object> intelligentClassify(@Valid @RequestBody TextIngestRequest request) {
        // 打印智能分类请求日志。
        log.info("智能分类请求: textLength={}", request.getCaseText() == null ? 0 : request.getCaseText().length());
        // 调用服务执行智能分类并回写。
        Object classifyResult = caseRecordService.intelligentClassify(request);
        // 打印智能分类响应日志。
        log.info("智能分类响应完成: caseId={}", request.getCaseId());
        // 返回统一成功响应。
        return ApiResponse.success(classifyResult);
    }

    /**
     * 处理Excel案件入库。
     */
    @PostMapping("/ingest/excel") // 定义Excel入库接口。
    public ApiResponse<List<String>> ingestExcel(@RequestParam("file") MultipartFile file) {
        // 打印请求文件日志。
        log.info("Excel入库请求: fileName={}", file.getOriginalFilename());
        // 调用服务执行入库。
        List<String> result = caseRecordService.ingestExcel(file);
        // 打印响应结果日志。
        log.info("Excel入库响应: size={}", result.size());
        // 返回统一成功响应。
        return ApiResponse.success(result);
    }

    /**
     * 导出当前查询页案件为Excel。
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCases(CaseQueryRequest request) {
        IPage<CaseRecord> pageData = caseRecordService.queryCases(request);
        List<CaseRecord> records = pageData.getRecords();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("案件导出");
            String[] headers = {
                    "案件编号", "纠纷类型", "当事人", "当事人身份证号", "当事人电话",
                    "当事人地址", "对方当事人", "对方当事人身份证号",
                    "对方当事人电话", "对方当事人地址", "事件来源", "摘要"
            };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }
            for (int i = 0; i < records.size(); i++) {
                CaseRecord r = records.get(i);
                CaseClassifyRecord classifyRecord = caseClassifyRecordMapper.selectOne(new LambdaQueryWrapper<CaseClassifyRecord>()
                        .eq(CaseClassifyRecord::getCaseId, r.getId())
                        .orderByDesc(CaseClassifyRecord::getCreatedAt)
                        .last("limit 1"));
                Row row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(nullSafe(r.getCaseNo()));
                row.createCell(1).setCellValue(nullSafe(r.getDisputeType()));
                row.createCell(2).setCellValue(nullSafe(r.getPartyName()));
                row.createCell(3).setCellValue(nullSafe(r.getPartyId()));
                row.createCell(4).setCellValue(nullSafe(r.getPartyPhone()));
                row.createCell(5).setCellValue(nullSafe(r.getPartyAddress()));
                row.createCell(6).setCellValue(nullSafe(r.getCounterpartyName()));
                row.createCell(7).setCellValue(nullSafe(r.getCounterpartyId()));
                row.createCell(8).setCellValue(nullSafe(r.getCounterpartyPhone()));
                row.createCell(9).setCellValue(nullSafe(r.getCounterpartyAddress()));
                row.createCell(10).setCellValue(nullSafe(r.getEventSource()));
                row.createCell(11).setCellValue(classifyRecord == null ? "" : nullSafe(classifyRecord.getFactsSummary()));
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=cases-export.xlsx")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(out.toByteArray());
        } catch (Exception ex) {
            throw new RuntimeException("导出失败: " + ex.getMessage(), ex);
        }
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    /**
     * 处理音频案件入库。
     */
    @PostMapping("/ingest/audio") // 定义音频入库接口。
    public ApiResponse<Map<String, String>> ingestAudio(@RequestParam("file") MultipartFile file) {
        // 打印请求文件日志。
        log.info("音频入库请求: fileName={}", file.getOriginalFilename());
        // 调用服务执行入库。
        Map<String, String> record = caseRecordService.ingestAudio(file);
        // 打印响应结果日志。
        log.info("音频入库响应:{}", record);
        // 返回统一成功响应。
        return ApiResponse.success(record);
    }


    /**
     * 生成案件文本预览。
     */
    private String buildCaseTextPreview(String caseText) {
        // 判断文本是否为空。
        if (caseText == null) {
            // 返回空标识。
            return "";
        }
        // 去除首尾空白字符。
        String normalized = caseText.trim();
        // 判断文本是否超过50字符。
        if (normalized.length() > 50) {
            // 返回截断预览。
            return normalized.substring(0, 50) + "...";
        }
        // 返回原始预览。
        return normalized;
    }

    /**
     * 查询案件分页数据。
     */
    @GetMapping // 定义查询接口。
    public ApiResponse<IPage<CaseRecord>> queryCases(CaseQueryRequest request) {
        // 打印查询请求日志。
        log.info("案件查询请求: keyword={}, disputeType={}, eventSource={}, riskLevel={}, pageNo={}, pageSize={}",
                request.getKeyword(), request.getDisputeType(), request.getEventSource(), request.getRiskLevel(), request.getPageNo(), request.getPageSize());
        // 调用服务执行查询。
        IPage<CaseRecord> pageData = caseRecordService.queryCases(request);
        // 打印查询响应日志。
        log.info("案件查询响应: total={}, size={}", pageData.getTotal(), pageData.getSize());
        // 返回统一成功响应。
        return ApiResponse.success(pageData);
    }

    /**
     * 查询智能助手详情。
     */
    @GetMapping("/assistant-detail")
    public ApiResponse<Map<String, Object>> assistantDetail(@RequestParam("caseId") Long caseId) {
        // 查询案件主记录。
        CaseRecord record = caseRecordMapper.selectById(caseId);
        // 判断案件是否存在。
        if (record == null) {
            throw new IllegalArgumentException("未找到案件记录: " + caseId);
        }
        // 查询最新分类记录。
        CaseClassifyRecord classifyRecord = caseClassifyRecordMapper.selectOne(new LambdaQueryWrapper<CaseClassifyRecord>()
                .eq(CaseClassifyRecord::getCaseId, caseId)
                .orderByDesc(CaseClassifyRecord::getCreatedAt)
                .last("limit 1"));
        CaseDisposalWorkflowRecord workflowRecord = caseDisposalWorkflowRecordMapper.selectOne(new LambdaQueryWrapper<CaseDisposalWorkflowRecord>()
                .eq(CaseDisposalWorkflowRecord::getCaseId, caseId)
                .orderByDesc(CaseDisposalWorkflowRecord::getCreatedAt)
                .last("limit 1"));

        // 组装响应结果。
        Map<String, Object> result = new HashMap<>();
        result.put("caseId", record.getId());
        result.put("caseNo", record.getCaseNo());
        result.put("partyName", record.getPartyName());
        result.put("partyId", record.getPartyId());
        result.put("partyPhone", record.getPartyPhone());
        result.put("partyAddress", record.getPartyAddress());
        result.put("counterpartyName", record.getCounterpartyName());
        result.put("counterpartyId", record.getCounterpartyId());
        result.put("counterpartyPhone", record.getCounterpartyPhone());
        result.put("counterpartyAddress", record.getCounterpartyAddress());
        result.put("disputeType", record.getDisputeType());
        result.put("disputeSubType", record.getDisputeSubType());
        result.put("disputeLocation", record.getDisputeLocation());
        result.put("handlingProgress", record.getHandlingProgress());
        result.put("riskLevel", record.getRiskLevel());
        result.put("caseText", record.getCaseText());
        result.put("registerTime", record.getRegisterTime());
        result.put("updatedAt", record.getUpdatedAt());
        result.put("audioFileUrl", record.getAudioFileUrl());
        result.put("audioDurationSec", record.getAudioDurationSec());

        if (workflowRecord != null) {
            result.put("mediationStatus", workflowRecord.getMediationStatus());
            result.put("flowLevel1", workflowRecord.getFlowLevel1());
            result.put("flowLevel2", workflowRecord.getFlowLevel2());
            result.put("flowLevel3", workflowRecord.getFlowLevel3());
            result.put("workflowCreatedAt", workflowRecord.getCreatedAt());
            result.put("diversionCompletedAt", workflowRecord.getDiversionCompletedAt());
            result.put("mediationCompletedAt", workflowRecord.getMediationCompletedAt());
            result.put("recommendedDepartment", workflowRecord.getRecommendedDepartment());
            result.put("recommendedMediationType", workflowRecord.getRecommendedMediationType());
            result.put("mediationAdvice", workflowRecord.getMediationAdvice());
        }

        if (classifyRecord != null) {
            result.put("factsSummary", classifyRecord.getFactsSummary());
            result.put("judgementBasis", classifyRecord.getJudgementBasis());
            result.put("judgementBasisText", buildJudgementBasisText(classifyRecord.getJudgementBasis()));
            result.put("emotionAssessment", classifyRecord.getEmotionAssessment());
            result.put("emotionAssessmentText", buildEmotionAssessmentText(classifyRecord.getEmotionAssessment()));
            result.put("modelSuggestedCategoryL1", classifyRecord.getModelSuggestedCategoryL1());
            result.put("modelSuggestedCategoryL2", classifyRecord.getModelSuggestedCategoryL2());
            result.put("parseError", classifyRecord.getParseError());
            result.put("classifyCreatedAt", classifyRecord.getCreatedAt());
        }
        return ApiResponse.success(result);
    }

    /**
     * 提交客户优化建议。
     */
    @PostMapping("/optimization-feedback")
    public ApiResponse<CaseOptimizationFeedback> submitOptimizationFeedback(@RequestBody Map<String, Object> request) {
        Object caseIdObj = request.get("caseId");
        String caseText = request.get("caseText") == null ? "" : String.valueOf(request.get("caseText")).trim();
        String correctionHint = request.get("correctionHint") == null ? "" : String.valueOf(request.get("correctionHint")).trim();
        if (caseIdObj == null) {
            throw new IllegalArgumentException("caseId不能为空");
        }
        if (caseText.isEmpty()) {
            throw new IllegalArgumentException("案件原文不能为空");
        }
        if (correctionHint.isEmpty()) {
            throw new IllegalArgumentException("评价建议内容不能为空");
        }

        Long caseId = Long.valueOf(String.valueOf(caseIdObj));
        CaseRecord caseRecord = caseRecordMapper.selectById(caseId);
        if (caseRecord == null) {
            throw new IllegalArgumentException("未找到案件记录: " + caseId);
        }

        Map<String, Object> inputs = new HashMap<>();
        inputs.put("case_text", caseText);
        inputs.put("correction_hint", correctionHint);
        Object difyResult = difyClient.runWorkflowWithInputs(inputs, correctionApiKey, "纠错建议");

        CaseOptimizationFeedback feedback = new CaseOptimizationFeedback();
        feedback.setCaseId(caseId);
        feedback.setCaseNo(caseRecord.getCaseNo());
        feedback.setCaseText(caseText);
        feedback.setSuggestionContent(correctionHint);
        feedback.setDifyResponse(extractParsedResponse(difyResult));
        feedback.setParsedResponse(extractParsedResponse(difyResult));
        feedback.setCreatedAt(LocalDateTime.now());
        caseOptimizationFeedbackMapper.insert(feedback);
        return ApiResponse.success(feedback);
    }

    /**
     * 查询客户优化建议列表。
     */
    @GetMapping("/optimization-feedbacks")
    public ApiResponse<List<CaseOptimizationFeedback>> listOptimizationFeedbacks() {
        List<CaseOptimizationFeedback> feedbackList = caseOptimizationFeedbackMapper.selectList(new LambdaQueryWrapper<CaseOptimizationFeedback>()
                .orderByDesc(CaseOptimizationFeedback::getCreatedAt));
        return ApiResponse.success(feedbackList);
    }


    private String extractParsedResponse(Object difyResult) {
        if (!(difyResult instanceof Map)) {
            return "";
        }
        Map<?, ?> root = (Map<?, ?>) difyResult;
        Object outputs = root.get("outputs");
        if (outputs instanceof Map) {
            Object text = ((Map<?, ?>) outputs).get("text");
            if (text == null) {
                text = ((Map<?, ?>) outputs).get("result_json");
            }
            if (text == null) {
                text = ((Map<?, ?>) outputs).get("answer");
            }
            if (text != null) {
                return String.valueOf(text);
            }
        }
        Object data = root.get("data");
        if (data instanceof Map) {
            Object dataOutputs = ((Map<?, ?>) data).get("outputs");
            if (dataOutputs instanceof Map) {
                Object text = ((Map<?, ?>) dataOutputs).get("text");
                if (text == null) {
                    text = ((Map<?, ?>) dataOutputs).get("result_json");
                }
                if (text == null) {
                    text = ((Map<?, ?>) dataOutputs).get("answer");
                }
                if (text != null) {
                    return String.valueOf(text);
                }
            }
        }
        return "";
    }


    private String buildJudgementBasisText(String judgementBasis) {
        if (judgementBasis == null || judgementBasis.trim().isEmpty()) {
            return "";
        }
        try {
            List<String> items = OBJECT_MAPPER.readValue(judgementBasis, new TypeReference<List<String>>() {});
            if (items == null || items.isEmpty()) {
                return judgementBasis;
            }
            return String.join("，", items);
        } catch (Exception ex) {
            log.warn("解析 judgement_basis 失败，返回原值: {}", ex.getMessage());
            return judgementBasis;
        }
    }

    private String buildEmotionAssessmentText(String emotionAssessment) {
        if (emotionAssessment == null || emotionAssessment.trim().isEmpty()) {
            return "";
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(emotionAssessment);
            JsonNode overall = root.path("overall");
            String label = overall.path("label").asText("");
            String evidence = overall.path("evidence").asText("");
            if (label.isEmpty() && evidence.isEmpty()) {
                return emotionAssessment;
            }
            if (evidence.isEmpty()) {
                return label;
            }
            if (label.isEmpty()) {
                return evidence;
            }
            return label + "：" + evidence;
        } catch (Exception ex) {
            log.warn("解析 emotion_assessment 失败，返回原值: {}", ex.getMessage());
            return emotionAssessment;
        }
    }

}

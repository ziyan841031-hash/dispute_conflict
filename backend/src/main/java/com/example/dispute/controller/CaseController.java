package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.dto.CaseQueryRequest;
import com.example.dispute.dto.TextIngestRequest;
import com.example.dispute.entity.CaseClassifyRecord;
import com.example.dispute.entity.CaseDisposalWorkflowRecord;
import com.example.dispute.entity.CaseRecord;
import com.example.dispute.mapper.CaseClassifyRecordMapper;
import com.example.dispute.mapper.CaseDisposalWorkflowRecordMapper;
import com.example.dispute.mapper.CaseRecordMapper;
import com.example.dispute.service.CaseRecordService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.validation.annotation.Validated;
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

import javax.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * 构造函数。
     */
    public CaseController(CaseRecordService caseRecordService, CaseRecordMapper caseRecordMapper,
                          CaseClassifyRecordMapper caseClassifyRecordMapper,
                          CaseDisposalWorkflowRecordMapper caseDisposalWorkflowRecordMapper) {
        // 注入案件服务。
        this.caseRecordService = caseRecordService;
        // 注入案件Mapper。
        this.caseRecordMapper = caseRecordMapper;
        // 注入分类Mapper。
        this.caseClassifyRecordMapper = caseClassifyRecordMapper;
        // 注入工作流Mapper。
        this.caseDisposalWorkflowRecordMapper = caseDisposalWorkflowRecordMapper;
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
    public ApiResponse<CaseRecord> ingestExcel(@RequestParam("file") MultipartFile file) {
        // 打印请求文件日志。
        log.info("Excel入库请求: fileName={}", file.getOriginalFilename());
        // 调用服务执行入库。
        CaseRecord record = caseRecordService.ingestExcel(file);
        // 打印响应结果日志。
        log.info("Excel入库响应: caseNo={}", record.getCaseNo());
        // 返回统一成功响应。
        return ApiResponse.success(record);
    }

    /**
     * 处理音频案件入库。
     */
    @PostMapping("/ingest/audio") // 定义音频入库接口。
    public ApiResponse<String> ingestAudio(@RequestParam("file") MultipartFile file) {
        // 打印请求文件日志。
        log.info("音频入库请求: fileName={}", file.getOriginalFilename());
        // 调用服务执行入库。
        String record = caseRecordService.ingestAudio(file);
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

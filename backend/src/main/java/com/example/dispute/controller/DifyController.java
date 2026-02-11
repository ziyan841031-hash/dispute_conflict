package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.dispute.client.DifyClient;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.dto.DifyInvokeRequest;
import com.example.dispute.entity.CaseDisposalWorkflowRecord;
import com.example.dispute.mapper.CaseDisposalWorkflowRecordMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Dify预留控制器。
 */
@RestController // 声明为REST控制器。
@RequestMapping("/api/dify") // 定义Dify接口根路径。
public class DifyController {

    // 定义日志对象。
    private static final Logger log = LoggerFactory.getLogger(DifyController.class);
    // 定义Dify客户端。
    private final DifyClient difyClient;
    // 定义流水记录Mapper。
    private final CaseDisposalWorkflowRecordMapper caseDisposalWorkflowRecordMapper;
    // 定义JSON工具。
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 纠纷处置工作流密钥。
    @Value("${dify.disposal-api-key:replace-with-disposal-key}")
    private String disposalApiKey;

    // 纠纷调解员建议API密钥。
    @Value("${dify.mediator-suggestion-api-key:replace-with-mediator-suggestion-key}")
    private String mediatorSuggestionApiKey;

    /**
     * 构造函数。
     */
    public DifyController(DifyClient difyClient, CaseDisposalWorkflowRecordMapper caseDisposalWorkflowRecordMapper) {
        // 注入Dify客户端。
        this.difyClient = difyClient;
        // 注入流水Mapper。
        this.caseDisposalWorkflowRecordMapper = caseDisposalWorkflowRecordMapper;
    }

    /**
     * 调用Dify工作流接口。
     */
    @PostMapping("/workflow-run") // 映射工作流接口。
    public ApiResponse<Object> runWorkflow(@RequestBody DifyInvokeRequest request) {
        // 打印请求日志。
        log.info("Dify workflow 请求: caseId={}, query={}", request.getCaseId(), request.getQuery());

        CaseDisposalWorkflowRecord latestRecord = findLatestRecordByCaseId(request.getCaseId());
        if (latestRecord != null && StringUtils.hasText(latestRecord.getMediationStatus())) {
            log.info("Dify workflow 命中已存在调解状态，直接返回库中记录: caseId={}, mediationStatus={}",
                    request.getCaseId(), latestRecord.getMediationStatus());
            return ApiResponse.success(latestRecord);
        }

        // 发起远程调用。
        Object data = difyClient.invoke("/chat-messages", request, disposalApiKey);
        // 落库流水并返回表记录。
        CaseDisposalWorkflowRecord record = saveWorkflowRecord(request.getCaseId(), data);
        // 打印响应日志。
        log.info("Dify workflow 响应成功");
        // 返回统一成功响应。
        return ApiResponse.success(record);
    }

    /**
     * 确认调解状态为调解中。
     */
    @PostMapping("/workflow-confirm")
    public ApiResponse<Object> confirmWorkflow(@RequestBody DifyInvokeRequest request) {
        Long caseId = request.getCaseId();
        if (caseId == null) {
            throw new IllegalArgumentException("caseId不能为空");
        }
        CaseDisposalWorkflowRecord record = findLatestRecordByCaseId(caseId);
        if (record == null) {
            throw new IllegalArgumentException("未找到workflow记录: " + caseId);
        }
        record.setMediationStatus("调解中");

        Object mediatorAdvice = null;
        try {
            mediatorAdvice = difyClient.invoke("/workflows/run", request, mediatorSuggestionApiKey);
        } catch (Exception ex) {
            log.warn("纠纷调解员建议调用失败: {}", ex.getMessage());
        }

        record.setMediationAdvice(extractHtmlAdvice(mediatorAdvice));
        caseDisposalWorkflowRecordMapper.updateById(record);

        return ApiResponse.success(record);
    }

    private String extractHtmlAdvice(Object mediatorAdvice) {
        if (mediatorAdvice == null) {
            return null;
        }
        try {
            Map<String, Object> root = objectMapper.convertValue(mediatorAdvice, new TypeReference<Map<String, Object>>() {});
            Object direct = root.get("html_advice");
            if (direct != null) {
                return String.valueOf(direct);
            }
            Object dataObj = root.get("data");
            if (dataObj instanceof Map) {
                Object nested = ((Map<?, ?>) dataObj).get("html_advice");
                if (nested != null) {
                    return String.valueOf(nested);
                }
                Object outputs = ((Map<?, ?>) dataObj).get("outputs");
                if (outputs instanceof Map) {
                    Object outAdvice = ((Map<?, ?>) outputs).get("html_advice");
                    if (outAdvice != null) {
                        return String.valueOf(outAdvice);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("解析html_advice失败: {}", ex.getMessage());
        }
        return null;
    }

    /**
     * 调用Dify聊天接口。
     */
    @PostMapping("/chat-message") // 映射聊天接口。
    public ApiResponse<Object> chatMessage(@RequestBody DifyInvokeRequest request) {
        // 打印请求日志。
        log.info("Dify chat 请求: query={}", request.getQuery());
        // 发起远程调用。
        Object data = difyClient.invoke("/chat-messages", request);
        // 打印响应日志。
        log.info("Dify chat 响应成功");
        // 返回统一成功响应。
        return ApiResponse.success(data);
    }

    /**
     * 调用Dify补全接口。
     */
    @PostMapping("/completion-message") // 映射补全接口。
    public ApiResponse<Object> completionMessage(@RequestBody DifyInvokeRequest request) {
        // 打印请求日志。
        log.info("Dify completion 请求: query={}", request.getQuery());
        // 发起远程调用。
        Object data = difyClient.invoke("/completion-messages", request);
        // 打印响应日志。
        log.info("Dify completion 响应成功");
        // 返回统一成功响应。
        return ApiResponse.success(data);
    }

    /**
     * 保存纠纷处置工作流流水记录。
     */
    private CaseDisposalWorkflowRecord saveWorkflowRecord(Long caseId, Object responseObj) {
        if (caseId == null || responseObj == null) {
            return null;
        }
        try {
            Map<String, Object> response = objectMapper.convertValue(responseObj, new TypeReference<Map<String, Object>>() {});
            Map<String, Object> answerMap = parseAnswerMap(response.get("answer"));
            Map<String, Object> flowMap = parseMap(answerMap.get("dispute_flow_nodes"));
            List<Object> ruleHints = parseList(answerMap.get("rule_hints_hit"));

            CaseDisposalWorkflowRecord record = findLatestRecordByCaseId(caseId);

            boolean exists = record != null;
            if (!exists) {
                record = new CaseDisposalWorkflowRecord();
                record.setCaseId(caseId);
                record.setCreatedAt(LocalDateTime.now());
            }

            record.setTaskId(toStringValue(response.get("task_id")));
            record.setMessageId(toStringValue(firstNonNull(response.get("message_id"), response.get("id"))));
            record.setConversationId(toStringValue(response.get("conversation_id")));
            record.setRecommendedDepartment(toStringValue(answerMap.get("recommended_department")));
            record.setRecommendedMediationType(toStringValue(answerMap.get("recommended_mediation_type")));
            record.setRecommendReason(toStringValue(answerMap.get("recommend_reason")));
            record.setBackupSuggestion(toStringValue(answerMap.get("backup_suggestion")));
            record.setRuleHintsHit(ruleHints == null ? null : objectMapper.writeValueAsString(ruleHints));
            record.setFlowLevel1(toStringValue(flowMap.get("level1")));
            record.setFlowLevel2(toStringValue(flowMap.get("level2")));
            record.setFlowLevel3(toStringValue(flowMap.get("level3")));
            record.setMediationStatus(resolveMediationStatus(answerMap, flowMap));
            record.setRawResponse(objectMapper.writeValueAsString(responseObj));

            if (exists) {
                caseDisposalWorkflowRecordMapper.updateById(record);
            } else {
                caseDisposalWorkflowRecordMapper.insert(record);
            }
            return record;
        } catch (Exception ex) {
            log.warn("Dify workflow 流水落库失败: {}", ex.getMessage());
            return null;
        }
    }

    private String resolveMediationStatus(Map<String, Object> answerMap, Map<String, Object> flowMap) {
        String status = toStringValue(firstNonNull(answerMap.get("mediation_status"), answerMap.get("mediationStatus")));
        if (StringUtils.hasText(status)) {
            return status;
        }
        return toStringValue(firstNonNull(flowMap.get("level4"), flowMap.get("mediation_status")));
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

    /**
     * 解析answer为Map。
     */
    private Map<String, Object> parseAnswerMap(Object answerObj) {
        if (answerObj == null) {
            return Collections.emptyMap();
        }
        try {
            if (answerObj instanceof String) {
                return objectMapper.readValue((String) answerObj, new TypeReference<Map<String, Object>>() {});
            }
            return objectMapper.convertValue(answerObj, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }

    /**
     * 解析对象为Map。
     */
    private Map<String, Object> parseMap(Object obj) {
        if (obj == null) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.convertValue(obj, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }

    /**
     * 解析对象为列表。
     */
    private List<Object> parseList(Object obj) {
        if (obj == null) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.convertValue(obj, new TypeReference<List<Object>>() {});
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    /**
     * 获取首个非空值。
     */
    private Object firstNonNull(Object a, Object b) {
        return a != null ? a : b;
    }

    /**
     * 安全转字符串。
     */
    private String toStringValue(Object val) {
        return val == null ? null : String.valueOf(val);
    }
}

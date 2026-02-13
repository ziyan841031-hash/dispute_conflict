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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
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

    @Value("${xiaobaogong.app-id:}")
    private String xbgAppId;

    @Value("${xiaobaogong.secret:}")
    private String xbgSecret;

    @Value("${xiaobaogong.base-url:https://api.xiaobaogong.com}")
    private String xbgBaseUrl;

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
        record.setDiversionCompletedAt(LocalDateTime.now());
        record.setMediationCompletedAt(null);

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
     * 获取小包公登录Token。
     */
    @PostMapping("/xbg/login")
    public ApiResponse<String> loginXiaoBaoGong(@RequestBody(required = false) Map<String, Object> request) {
        try {
            long timestamp = System.currentTimeMillis() / 1000;
            String nonce = UUID.randomUUID().toString().replace("-", "");
            String role = request == null ? "普通市民" : String.valueOf(request.getOrDefault("role", "普通市民"));
            if (!"解纷工作人员".equals(role)) {
                role = "普通市民";
            }
            String signStr = String.format("timestamp=%s&nonce=%s&secret=%s&timestamp=%s",
                    timestamp, nonce, xbgSecret, timestamp);
            String signature = sha256(signStr);

            Map<String, Object> payload = new HashMap<>();
            payload.put("signature", signature);
            payload.put("appid", xbgAppId);
            payload.put("nonce", nonce);
            payload.put("timestamp", timestamp);
            payload.put("mode", "third");
            payload.put("username", role);
            log.info("xbg login req: {}", objectMapper.writeValueAsString(payload));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            RestTemplate restTemplate = new RestTemplate();
            String result = restTemplate.postForObject(xbgBaseUrl + "/v2-api/signature", entity, String.class);
            log.info("xbg login result: {}", result);

            Map<String, Object> resultMap = objectMapper.readValue(result, new TypeReference<Map<String, Object>>() {});
            Number statusCode = (Number) resultMap.get("statusCode");
            Object data = resultMap.get("data");
            if (statusCode != null && statusCode.intValue() == 1 && data != null) {
                return ApiResponse.success(String.valueOf(data));
            }
            return ApiResponse.fail("获取失败请稍后再试");
        } catch (Exception ex) {
            log.warn("xbg login failed: {}", ex.getMessage());
            return ApiResponse.fail("获取失败请稍后再试");
        }
    }

    /**
     * 调用法律服务聊天接口。
     */
    @PostMapping("/chat-message") // 映射聊天接口。
    public ApiResponse<Object> chatMessage(@RequestBody(required = false) Map<String, Object> request) {
        try {
            String question = request == null ? "" : String.valueOf(request.getOrDefault("question", ""));
            String role = request == null ? "普通市民" : String.valueOf(request.getOrDefault("role", "普通市民"));
            String token = request == null ? "" : String.valueOf(request.getOrDefault("token", ""));
            String rawResponse = request == null ? "0" : String.valueOf(request.getOrDefault("rawResponse", "0"));
            int bizType = 0;
            if (request != null && request.get("type") != null) {
                bizType = Integer.parseInt(String.valueOf(request.get("type")));
            }
            if (!StringUtils.hasText(question) || !StringUtils.hasText(token)) {
                return ApiResponse.fail("获取失败请稍后再试");
            }

            String finalQuestion;
            if (bizType == 0) {
                finalQuestion = "你是一名" + role + question;
            } else if (bizType == 1) {
                if (!StringUtils.hasText(rawResponse) || "0".equals(rawResponse)) {
                    return ApiResponse.fail("获取失败请稍后再试");
                }
                Map<String, Object> summaryMap = callXbgChat(token, rawResponse + " 保持原文意思，生成精简摘要");
                String summaryText = extractAnswerText(summaryMap);
                finalQuestion = "你是一名" + role + summaryText + question;
            } else {
                finalQuestion = question;
            }

            Map<String, Object> resultMap = callXbgChat(token, finalQuestion);
            resultMap.put("rawResponse", extractAnswerText(resultMap));
            return ApiResponse.success(resultMap);
        } catch (Exception ex) {
            log.warn("xbg chat failed: {}", ex.getMessage());
            return ApiResponse.fail("获取失败请稍后再试");
        }
    }

    private Map<String, Object> callXbgChat(String token, String question) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("question", question);
        payload.put("type", "case");
        payload.put("search", false);
        log.info("xbg chat req: {}", objectMapper.writeValueAsString(payload));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", token);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        RestTemplate restTemplate = new RestTemplate();
        String result = restTemplate.postForObject(xbgBaseUrl + "/v1/api/chat/completions", entity, String.class);
        log.info("xbg chat result: {}", result);
        if (!StringUtils.hasText(result)) {
            throw new IllegalArgumentException("xbg chat empty result");
        }
        return objectMapper.readValue(result, new TypeReference<Map<String, Object>>() {});
    }

    private String extractAnswerText(Map<String, Object> resultMap) {
        if (resultMap == null) {
            return "";
        }
        Object direct = firstNonNull(resultMap.get("answer"), resultMap.get("text"), resultMap.get("output"), resultMap.get("content"));
        if (direct != null) {
            return String.valueOf(direct);
        }
        Object dataObj = resultMap.get("data");
        if (dataObj instanceof Map) {
            Object nested = firstNonNull(((Map<?, ?>) dataObj).get("answer"), ((Map<?, ?>) dataObj).get("text"), ((Map<?, ?>) dataObj).get("output"), ((Map<?, ?>) dataObj).get("content"));
            if (nested != null) {
                return String.valueOf(nested);
            }
        }
        return "";
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
            if ("调解中".equals(record.getMediationStatus()) && record.getDiversionCompletedAt() == null) {
                record.setDiversionCompletedAt(LocalDateTime.now());
                record.setMediationCompletedAt(null);
            }
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

    private String sha256(String raw) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
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

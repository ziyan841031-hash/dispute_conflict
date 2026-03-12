package com.example.dispute.client;

import com.example.dispute.dto.DifyInvokeRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Collections;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.UUID;

/**
 * Dify客户端。
 */
@Component // 声明为组件。
public class DifyClient {

    // 定义日志对象。
    private static final Logger log = LoggerFactory.getLogger(DifyClient.class);
    // 定义HTTP客户端。
    private final RestTemplate restTemplate = new RestTemplate();
    // 定义JSON解析器。
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 注入Dify地址。
    @Value("${dify.base-url:http://localhost:5001/v1}")
    private String difyBaseUrl;

    // 注入Dify密钥。
    @Value("${dify.api-key:replace-with-real-key}")
    private String apiKey;

    // 注入要素提取工作流路径。
    @Value("${dify.extract-workflow-endpoint:/workflows/run}")
    private String extractWorkflowEndpoint;

    // 注入要素提取用户标识。
    @Value("${dify.extract-user:abc-123}")
    private String extractUser;

    // 注入智能分类接口专用密钥。
    @Value("${dify.classify-api-key:replace-with-classify-key}")
    private String classifyApiKey;

    /**
     * 调用Dify接口。
     */
    public Object invoke(String endpoint, DifyInvokeRequest request, String currentApiKey) {
        // 拼接请求地址。
        String url = difyBaseUrl + endpoint;
        // 创建请求头。
        HttpHeaders headers = new HttpHeaders();
        // 设置内容类型。
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 设置认证令牌。
        headers.setBearerAuth(currentApiKey);

        // 创建请求体Map。
        Map<String, Object> body = new HashMap<>();
        // 设置查询内容。
        body.put("query", request.getQuery());
        // 设置输入变量。
        body.put("inputs", request.getVariables());
        // 设置响应模式。
        body.put("response_mode", "blocking");
        // 设置用户标识。
        body.put("user", "admin-console");

        // 打印请求日志。
        log.info("DifyClient请求: url={}, query={}", url, request.getQuery());
        // 构造请求实体。
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        // 发起POST请求。
        ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.POST, entity, Object.class);
        // 打印响应日志。
        log.info("DifyClient响应: status={}", response.getStatusCodeValue());
        // 返回响应体。
        return response.getBody();
    }


    /**
     * 调用Dify接口（默认密钥）。
     */
    public Object invoke(String endpoint, DifyInvokeRequest request) {
        return invoke(endpoint, request, apiKey);
    }



    /**
     * 以自定义inputs调用工作流并解析SSE报文。
     */
    public Object runWorkflowWithInputs(Map<String, Object> inputs, String currentApiKey, String scene) {
        // 拼接请求地址。
        String url = difyBaseUrl + extractWorkflowEndpoint;
        // 生成链路追踪ID。
        String traceId = UUID.randomUUID().toString();
        // 创建请求头。
        HttpHeaders headers = new HttpHeaders();
        // 设置内容类型。
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 设置认证令牌。
        headers.setBearerAuth(currentApiKey);
        // 设置追踪ID请求头（优先级最高）。
        headers.set("X-Trace-Id", traceId);

        // 创建请求体Map。
        Map<String, Object> body = new HashMap<>();
        // 设置输入参数（必填）。
        body.put("inputs", inputs == null ? new HashMap<String, Object>() : inputs);
        // 设置响应模式（必填）。
        body.put("response_mode", "streaming");
        // 设置用户标识（必填）。
        body.put("user", extractUser);
        // 设置可选文件列表（当前无文件时传空列表）。
        body.put("files", Collections.emptyList());
        // 设置链路追踪ID（可选，兜底透传）。
        body.put("trace_id", traceId);

        // 打印请求日志。
        log.info("Dify{}请求: url={}, inputKeys={}, traceId={}", scene, url, body.get("inputs"), traceId);
        // 构造请求实体。
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        // 发起POST请求。
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        // 打印响应状态日志。
        log.info("Dify{}响应: status={}, traceId={}", scene, response.getStatusCodeValue(), traceId);
        // 解析SSE报文并返回结构化结果。
        return parseWorkflowSseResponse(response.getBody());
    }

    /**
     * 调用Dify要素提取工作流并解析SSE报文。
     */
    public Object runExtractWorkflow(String caseText) {
        // 使用要素提取密钥调用工作流。
        return runWorkflowByApiKey(caseText, apiKey, "要素提取", "material_text");
    }

    /**
     * 调用Dify智能分类工作流。
     */
    public Object runClassifyWorkflow(String caseText) {
        // 使用智能分类专用密钥调用工作流。
        return runWorkflowByApiKey(caseText, classifyApiKey, "智能分类", "dispute_info");
    }

    /**
     * 按指定密钥调用同一工作流并解析SSE报文。
     */
    private Object runWorkflowByApiKey(String caseText, String currentApiKey, String scene, String inputKey) {
        // 拼接请求地址。
        String url = difyBaseUrl + extractWorkflowEndpoint;
        // 生成链路追踪ID。
        String traceId = UUID.randomUUID().toString();
        // 创建请求头。
        HttpHeaders headers = new HttpHeaders();
        // 设置内容类型。
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 设置认证令牌。
        headers.setBearerAuth(currentApiKey);
        // 设置追踪ID请求头（优先级最高）。
        headers.set("X-Trace-Id", traceId);

        // 创建输入参数对象（inputs为必填）。
        Map<String, Object> inputs = new HashMap<>();
        // 按App变量定义传值，文本为空则不设置具体变量，仅保留空对象。
        if (StringUtils.hasText(caseText)) {
            inputs.put(inputKey, caseText);
        }

        // 创建请求体Map。
        Map<String, Object> body = new HashMap<>();
        // 设置输入参数（必填）。
        body.put("inputs", inputs);
        // 设置响应模式（必填）。
        body.put("response_mode", "streaming");
        // 设置用户标识（必填）。
        body.put("user", extractUser);
        // 设置可选文件列表（当前无文件时传空列表）。
        body.put("files", Collections.emptyList());
        // 设置链路追踪ID（可选，兜底透传）。
        body.put("trace_id", traceId);

        // 打印请求日志。
        log.info("Dify{}请求: url={}, inputKey={}, textLength={}, traceId={}", scene, url, inputKey, caseText == null ? 0 : caseText.length(), traceId);
        // 构造请求实体。
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        // 发起POST请求。
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        // 打印响应状态日志。
        log.info("Dify{}响应: status={}, traceId={}", scene, response.getStatusCodeValue(), traceId);
        // 解析SSE报文并返回结构化结果。
        return parseWorkflowSseResponse(response.getBody());
    }

    /**
     * 解析Dify工作流SSE响应，提取最终outputs。
     */
    public Object invokeChatMessagesStreaming(DifyInvokeRequest request, String currentApiKey) {
        String url = difyBaseUrl + "/chat-messages";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(currentApiKey);

        Map<String, Object> body = new HashMap<>();
        Map<String, Object> inputs = request == null || request.getVariables() == null
                ? new HashMap<String, Object>()
                : new HashMap<>(request.getVariables());
        if (request != null && StringUtils.hasText(request.getChangeDepartment())) {
            inputs.put("change_department", request.getChangeDepartment().trim());
        }
        body.put("inputs", inputs);
        body.put("query", request == null ? "" : request.getQuery());
        body.put("response_mode", "streaming");
        body.put("conversation_id", "");
        body.put("user", extractUser);

        List<Map<String, Object>> files = new ArrayList<>();
        Map<String, Object> file = new HashMap<>();
        file.put("type", "image");
        file.put("transfer_method", "remote_url");
        file.put("url", "https://cloud.dify.ai/logo/logo-site.png");
        files.add(file);
        body.put("files", files);

        log.info("Dify chat-messages streaming request: url={}, caseId={}", url, request == null ? null : request.getCaseId());
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        log.info("Dify chat-messages streaming response: status={}", response.getStatusCodeValue());
        return parseChatMessageSseResponse(response.getBody());
    }

    private Map<String, Object> parseChatMessageSseResponse(String sseBody) {
        Map<String, Object> result = new HashMap<>();
        result.put("raw", sseBody);
        if (!StringUtils.hasText(sseBody)) {
            result.put("answer", "");
            return result;
        }

        StringBuilder answerBuilder = new StringBuilder();
        String conversationId = "";
        String messageId = "";
        String taskId = "";
        int eventCount = 0;

        String[] blocks = sseBody.split("\n\n");
        for (String block : blocks) {
            String[] lines = block.split("\n");
            for (String line : lines) {
                if (!line.startsWith("data:")) {
                    continue;
                }
                String json = line.substring(5).trim();
                if (!StringUtils.hasText(json) || "[DONE]".equalsIgnoreCase(json)) {
                    continue;
                }
                try {
                    Map<String, Object> eventMap = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
                    eventCount++;
                    Object event = eventMap.get("event");
                    if ("message".equals(event)) {
                        String chunk = String.valueOf(eventMap.getOrDefault("answer", ""));
                        answerBuilder.append(chunk);
                    }
                    if (!StringUtils.hasText(conversationId) && eventMap.get("conversation_id") != null) {
                        conversationId = String.valueOf(eventMap.get("conversation_id"));
                    }
                    if (!StringUtils.hasText(messageId) && eventMap.get("message_id") != null) {
                        messageId = String.valueOf(eventMap.get("message_id"));
                    }
                    if (!StringUtils.hasText(taskId) && eventMap.get("task_id") != null) {
                        taskId = String.valueOf(eventMap.get("task_id"));
                    }
                } catch (IOException ex) {
                    result.put("parse_error", ex.getMessage());
                    log.warn("parse chat message sse failed: line={}", line, ex);
                }
            }
        }

        result.put("answer", answerBuilder.toString());
        result.put("conversation_id", conversationId);
        result.put("message_id", messageId);
        result.put("task_id", taskId);
        result.put("event_count", eventCount);
        return result;
    }

    private Map<String, Object> parseWorkflowSseResponse(String sseBody) {
        // 创建返回对象。
        Map<String, Object> result = new HashMap<>();
        // 设置默认原始报文。
        result.put("raw", sseBody);
        // 初始化事件计数。
        int eventCount = 0;
        // 判断报文是否为空。
        if (!StringUtils.hasText(sseBody)) {
            // 写入空结果说明。
            result.put("message", "SSE响应为空");
            // 返回结果。
            return result;
        }

        // 按空行切分SSE事件块。
        String[] blocks = sseBody.split("\\n\\n");
        // 遍历事件块。
        for (String block : blocks) {
            // 按行切分事件块。
            String[] lines = block.split("\\n");
            // 遍历每一行。
            for (String line : lines) {
                // 仅处理data行。
                if (!line.startsWith("data: ")) {
                    // 跳过非data行。
                    continue;
                }
                // 提取JSON字符串。
                String json = line.substring("data: ".length()).trim();
                // 判断JSON是否为空。
                if (!StringUtils.hasText(json)) {
                    // 跳过空数据。
                    continue;
                }
                try {
                    // 解析为Map对象。
                    Map<String, Object> eventMap = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
                    });
                    // 事件计数加一。
                    eventCount++;
                    // 读取事件名。
                    Object event = eventMap.get("event");
                    // 判断是否为工作流结束事件。
                    if ("workflow_finished".equals(event)) {
                        // 提取data对象。
                        Object dataObj = eventMap.get("data");
                        // 判断data对象类型。
                        if (dataObj instanceof Map) {
                            // 强转data对象。
                            Map<?, ?> dataMap = (Map<?, ?>) dataObj;
                            // 提取outputs对象。
                            Object outputsObj = dataMap.get("outputs");
                            // 写入最终输出。
                            result.put("outputs", outputsObj);
                            // 写入工作流状态。
                            result.put("workflow_status", dataMap.get("status"));
                            // 写入workflow_run_id。
                            result.put("workflow_run_id", eventMap.get("workflow_run_id"));
                        }
                    }
                } catch (IOException ex) {
                    // 写入解析错误信息。
                    result.put("parse_error", ex.getMessage());
                    // 打印解析错误日志。
                    log.warn("SSE事件解析失败: line={}", line, ex);
                }
            }
        }
        // 写入事件总数。
        result.put("event_count", eventCount);
        // 打印解析摘要日志。
        log.info("Dify要素提取SSE解析完成: eventCount={}, hasOutputs={}", eventCount, result.containsKey("outputs"));
        // 返回解析结果。
        return result;
    }
}

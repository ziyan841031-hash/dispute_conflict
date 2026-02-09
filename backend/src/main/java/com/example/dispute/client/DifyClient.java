package com.example.dispute.client;

import com.example.dispute.dto.DifyInvokeRequest;
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

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
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

    /**
     * 调用Dify接口。
     */
    public Object invoke(String endpoint, DifyInvokeRequest request) {
        // 拼接请求地址。
        String url = difyBaseUrl + endpoint;
        // 创建请求头。
        HttpHeaders headers = new HttpHeaders();
        // 设置内容类型。
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 设置认证令牌。
        headers.setBearerAuth(apiKey);

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
     * 调用Dify要素提取工作流。
     */
    public Object runExtractWorkflow(String caseText) {
        // 拼接请求地址。
        String url = difyBaseUrl + extractWorkflowEndpoint;
        // 生成链路追踪ID。
        String traceId = UUID.randomUUID().toString();
        // 创建请求头。
        HttpHeaders headers = new HttpHeaders();
        // 设置内容类型。
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 设置认证令牌。
        headers.setBearerAuth(apiKey);
        // 设置追踪ID请求头（优先级最高）。
        headers.set("X-Trace-Id", traceId);

        // 创建输入参数对象（inputs为必填）。
        Map<String, Object> inputs = new HashMap<>();
        // 按App变量定义传值，文本为空则不设置具体变量，仅保留空对象。
        if (StringUtils.hasText(caseText)) {
            inputs.put("material_text", caseText);
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
        log.info("Dify要素提取请求: url={}, textLength={}, traceId={}", url, caseText == null ? 0 : caseText.length(), traceId);
        // 构造请求实体。
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        // 发起POST请求。
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        // 打印响应日志。
        log.info("Dify要素提取响应: status={}, traceId={}", response.getStatusCodeValue(), traceId);
        // 返回响应体。
        return response.getBody();
    }
}

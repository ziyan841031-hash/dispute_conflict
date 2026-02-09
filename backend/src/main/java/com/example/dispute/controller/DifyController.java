package com.example.dispute.controller;

import com.example.dispute.client.DifyClient;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.dto.DifyInvokeRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    /**
     * 构造函数。
     */
    public DifyController(DifyClient difyClient) {
        // 注入Dify客户端。
        this.difyClient = difyClient;
    }

    /**
     * 调用Dify工作流接口。
     */
    @PostMapping("/workflow-run") // 映射工作流接口。
    public ApiResponse<Object> runWorkflow(@RequestBody DifyInvokeRequest request) {
        // 打印请求日志。
        log.info("Dify workflow 请求: query={}", request.getQuery());
        // 发起远程调用。
        Object data = difyClient.invoke("/workflows/run", request);
        // 打印响应日志。
        log.info("Dify workflow 响应成功");
        // 返回统一成功响应。
        return ApiResponse.success(data);
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
}

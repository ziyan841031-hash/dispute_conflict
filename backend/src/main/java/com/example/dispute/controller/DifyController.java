package com.example.dispute.controller;

import com.example.dispute.client.DifyClient;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.dto.DifyInvokeRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dify")
public class DifyController {

    private final DifyClient difyClient;

    public DifyController(DifyClient difyClient) {
        this.difyClient = difyClient;
    }

    @PostMapping("/workflow-run")
    public ApiResponse<Object> runWorkflow(@RequestBody DifyInvokeRequest request) {
        return ApiResponse.success(difyClient.invoke("/workflows/run", request));
    }

    @PostMapping("/chat-message")
    public ApiResponse<Object> chatMessage(@RequestBody DifyInvokeRequest request) {
        return ApiResponse.success(difyClient.invoke("/chat-messages", request));
    }

    @PostMapping("/completion-message")
    public ApiResponse<Object> completionMessage(@RequestBody DifyInvokeRequest request) {
        return ApiResponse.success(difyClient.invoke("/completion-messages", request));
    }
}

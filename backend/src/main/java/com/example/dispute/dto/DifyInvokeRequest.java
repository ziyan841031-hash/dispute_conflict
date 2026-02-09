package com.example.dispute.dto;

import lombok.Data;

import java.util.Map;

@Data
public class DifyInvokeRequest {
    private String query;
    private Map<String, Object> variables;
}

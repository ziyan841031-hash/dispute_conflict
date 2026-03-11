package com.example.dispute.dto;

import lombok.Data;

import java.util.Map;

@Data
public class DifyInvokeRequest {
    private Long caseId;
    private String query;
    private String caseSummary;
    private Map<String, Object> variables;
}


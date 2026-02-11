package com.example.dispute.dto;

import lombok.Data;

@Data
public class CaseQueryRequest {
    private String keyword;
    private String disputeType;
    private String eventSource;
    private String riskLevel;
    private Long pageNo = 1L;
    private Long pageSize = 10L;
}

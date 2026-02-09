package com.example.dispute.dto;

import lombok.Data;

@Data
public class CaseQueryRequest {
    private String keyword;
    private String sourceType;
    private Long pageNo = 1L;
    private Long pageSize = 10L;
}

package com.example.dispute.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class TextIngestRequest {

    @NotBlank(message = "案件描述不能为空")
    private String caseText;

    private String partyName;
    private String counterpartyName;
    private String disputeType;
    private String riskLevel;
    private String handlingProgress;
    private String receiver;
    private String eventSource;
}

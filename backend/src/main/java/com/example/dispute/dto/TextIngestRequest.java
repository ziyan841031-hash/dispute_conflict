package com.example.dispute.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class TextIngestRequest {

    @NotBlank(message = "案件描述不能为空")
    private String caseText;
}

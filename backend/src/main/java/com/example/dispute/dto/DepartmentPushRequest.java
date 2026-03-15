package com.example.dispute.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class DepartmentPushRequest {

    private Long caseId;

    @JsonProperty("case_raw_info")
    private String caseRawInfo;

    @JsonProperty("recommended_department")
    private String recommendedDepartment;

    @JsonProperty("case_category")
    private String caseCategory;

    @JsonProperty("case_level")
    private String caseLevel;

    @JsonProperty("current_stage")
    private String currentStage;

    @JsonProperty("event_source")
    private String eventSource;

    private String query;
}

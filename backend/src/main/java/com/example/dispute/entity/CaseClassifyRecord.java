package com.example.dispute.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("case_classify_record")
public class CaseClassifyRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("case_id")
    private Long caseId;

    @TableField("workflow_run_id")
    private String workflowRunId;

    @TableField("dispute_category_l1")
    private String disputeCategoryL1;

    @TableField("dispute_category_l2")
    private String disputeCategoryL2;

    @TableField("model_suggested_category_l1")
    private String modelSuggestedCategoryL1;

    @TableField("model_suggested_category_l2")
    private String modelSuggestedCategoryL2;

    @TableField("risk_level")
    private String riskLevel;

    @TableField("facts_summary")
    private String factsSummary;

    @TableField("judgement_basis")
    private String judgementBasis;

    @TableField("emotion_assessment")
    private String emotionAssessment;

    @TableField("is_in_client_taxonomy")
    private Integer isInClientTaxonomy;

    @TableField("parse_error")
    private String parseError;

    @TableField("created_at")
    private LocalDateTime createdAt;
}

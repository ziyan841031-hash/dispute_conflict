package com.example.dispute.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 纠纷处置工作流流水记录。
 */
@Data
@TableName("case_disposal_workflow_record")
public class CaseDisposalWorkflowRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("case_id")
    private Long caseId;

    @TableField("task_id")
    private String taskId;

    @TableField("message_id")
    private String messageId;

    @TableField("conversation_id")
    private String conversationId;

    @TableField("recommended_department")
    private String recommendedDepartment;

    @TableField("recommended_mediation_type")
    private String recommendedMediationType;

    @TableField("recommend_reason")
    private String recommendReason;

    @TableField("backup_suggestion")
    private String backupSuggestion;

    @TableField("rule_hints_hit")
    private String ruleHintsHit;

    @TableField("flow_level_1")
    private String flowLevel1;

    @TableField("flow_level_2")
    private String flowLevel2;

    @TableField("flow_level_3")
    private String flowLevel3;

    @TableField("mediation_status")
    private String mediationStatus;

    @TableField("mediation_advice")
    private String mediationAdvice;

    @TableField("raw_response")
    private String rawResponse;

    @TableField("created_at")
    private LocalDateTime createdAt;
}

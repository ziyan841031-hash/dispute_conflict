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

    @TableField("diversion_completed_at")
    private LocalDateTime diversionCompletedAt;

    @TableField("mediation_completed_at")
    private LocalDateTime mediationCompletedAt;

    @TableField("mediation_advice")
    private String mediationAdvice;

    @TableField("briefing")
    private String briefing;

    @TableField("briefing_document_path")
    private String briefingDocumentPath;

    @TableField("briefing_generated_at")
    private LocalDateTime briefingGeneratedAt;

    @TableField("archive_completed_at")
    private LocalDateTime archiveCompletedAt;

    @TableField("archive_summary")
    private String archiveSummary;

    @TableField("archive_document_path")
    private String archiveDocumentPath;

    @TableField("mediation_document_generated_at")
    private LocalDateTime mediationDocumentGeneratedAt;

    @TableField("archive_report_path")
    private String archiveReportPath;

    @TableField("archive_report_generated_at")
    private LocalDateTime archiveReportGeneratedAt;

    @TableField("facts_process")
    private String factsProcess;

    @TableField("responsibility_split")
    private String responsibilitySplit;

    @TableField("expedite_supervise_status")
    private Integer expediteSuperviseStatus;

    @TableField("raw_response")
    private String rawResponse;

    @TableField("created_at")
    private LocalDateTime createdAt;
}
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

    @TableField("classify_payload")
    private String classifyPayload;

    @TableField("created_at")
    private LocalDateTime createdAt;
}

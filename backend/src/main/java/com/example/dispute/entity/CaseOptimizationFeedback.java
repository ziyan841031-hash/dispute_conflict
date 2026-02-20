package com.example.dispute.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("case_optimization_feedback")
public class CaseOptimizationFeedback {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("case_id")
    private Long caseId;

    @TableField("case_no")
    private String caseNo;

    @TableField("suggestion_content")
    private String suggestionContent;

    @TableField("created_at")
    private LocalDateTime createdAt;
}

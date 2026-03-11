package com.example.dispute.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("case_dynamic_tracking_record")
public class CaseDynamicTrackingRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("case_id")
    private Long caseId;

    @TableField("question")
    private String question;

    @TableField("answer")
    private String answer;

    @TableField("summary")
    private String summary;

    @TableField("event_time")
    private LocalDateTime eventTime;

    @TableField("event_source")
    private String eventSource;
}

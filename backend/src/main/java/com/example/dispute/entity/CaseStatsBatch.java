package com.example.dispute.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("case_stats_batch")
public class CaseStatsBatch {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("batch_no")
    private String batchNo;

    @TableField("record_count")
    private Integer recordCount;

    @TableField("imported_at")
    private LocalDateTime importedAt;

    @TableField("report_generated_at")
    private LocalDateTime reportGeneratedAt;

    @TableField("report_file_url")
    private String reportFileUrl;

    @TableField("created_at")
    private LocalDateTime createdAt;
}

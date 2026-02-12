package com.example.dispute.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("case_stats_detail")
public class CaseStatsDetail {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("batch_id")
    private Long batchId;

    @TableField("serial_no")
    private String serialNo;

    @TableField("event_time")
    private String eventTime;

    @TableField("district")
    private String district;

    @TableField("street_town")
    private String streetTown;

    @TableField("register_source")
    private String registerSource;

    @TableField("case_type")
    private String caseType;

    @TableField("register_time")
    private String registerTime;

    @TableField("current_status")
    private String currentStatus;

    @TableField("created_at")
    private LocalDateTime createdAt;
}

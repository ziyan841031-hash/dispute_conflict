package com.example.dispute.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("clue_info")
public class ClueInfo {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("district")
    private String district;

    @TableField("street_town")
    private String streetTown;

    @TableField("clue")
    private String clue;

    @TableField("clue_interpretation")
    private String clueInterpretation;

    @TableField("clue_source")
    private String clueSource;

    @TableField("clue_time")
    private LocalDateTime clueTime;

    @TableField("status")
    private String status;

    @TableField("created_at")
    private LocalDateTime createdAt;

    @TableField("updated_at")
    private LocalDateTime updatedAt;
}

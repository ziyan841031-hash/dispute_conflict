package com.example.dispute.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 处置机构码表实体。
 */
@Data
@TableName("disposal_org_dict")
public class DisposalOrgDict {

    @TableId
    private Long id;

    @TableField("org_name")
    private String orgName;

    @TableField("org_phone")
    private String orgPhone;

    @TableField("org_address")
    private String orgAddress;

    @TableField("active_case_count")
    private Integer activeCaseCount;

    @TableField("success_rate")
    private BigDecimal successRate;

    @TableField("duty_person")
    private String dutyPerson;

    @TableField("leader_name")
    private String leaderName;

    @TableField("duty_phone")
    private String dutyPhone;

    @TableField("mediation_category")
    private String mediationCategory;

    @TableField("created_at")
    private LocalDateTime createdAt;

    @TableField("updated_at")
    private LocalDateTime updatedAt;
}

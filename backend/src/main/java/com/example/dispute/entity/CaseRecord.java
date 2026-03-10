package com.example.dispute.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("case_record")
public class CaseRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("case_no")
    private String caseNo;

    @TableField("party_name")
    private String partyName;

    @TableField("counterparty_name")
    private String counterpartyName;

    @TableField("dispute_type")
    private String disputeType;

    @TableField("party_id")
    private String partyId;

    @TableField("party_phone")
    private String partyPhone;

    @TableField("party_address")
    private String partyAddress;

    @TableField("counterparty_id")
    private String counterpartyId;

    @TableField("counterparty_phone")
    private String counterpartyPhone;

    @TableField("counterparty_address")
    private String counterpartyAddress;

    @TableField("dispute_location")
    private String disputeLocation;

    @TableField("dispute_sub_type")
    private String disputeSubType;

    @TableField("event_source")
    private String eventSource;

    @TableField("risk_level")
    private String riskLevel;

    @TableField("handling_progress")
    private String handlingProgress;

    @TableField("receiver")
    private String receiver;

    @TableField("register_time")
    private LocalDateTime registerTime;

    @TableField("case_text")
    private String caseText;

    @TableField("source_file_name")
    private String sourceFileName;

    @TableField("audio_duration_sec")
    private Integer audioDurationSec;

    @TableField("created_at")
    private LocalDateTime createdAt;

    @TableField("updated_at")
    private LocalDateTime updatedAt;
}

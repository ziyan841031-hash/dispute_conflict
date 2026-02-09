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

    @TableField("source_type")
    private String sourceType;

    @TableField("case_text")
    private String caseText;

    @TableField("source_file_name")
    private String sourceFileName;

    @TableField("audio_duration_sec")
    private Integer audioDurationSec;

    @TableField("status")
    private String status;

    @TableField("created_at")
    private LocalDateTime createdAt;

    @TableField("updated_at")
    private LocalDateTime updatedAt;
}

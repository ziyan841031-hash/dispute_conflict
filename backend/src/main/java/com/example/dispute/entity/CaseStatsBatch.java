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


    @TableField("time_trend_json")
    private String timeTrendJson;

    @TableField("street_top10_json")
    private String streetTop10Json;

    @TableField("type_top10_json")
    private String typeTop10Json;

    @TableField("district_status_json")
    private String districtStatusJson;

    @TableField("time_chart_path")
    private String timeChartPath;

    @TableField("street_chart_path")
    private String streetChartPath;

    @TableField("type_chart_path")
    private String typeChartPath;

    @TableField("district_chart_path")
    private String districtChartPath;

    @TableField("report_file_path")
    private String reportFilePath;

    @TableField("created_at")
    private LocalDateTime createdAt;
}

package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.dto.CaseQueryRequest;
import com.example.dispute.dto.TextIngestRequest;
import com.example.dispute.entity.CaseRecord;
import com.example.dispute.service.CaseRecordService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;

/**
 * 案件控制器。
 */
@RestController // 声明为REST控制器。
@RequestMapping("/api/cases") // 定义案件接口根路径。
@Validated // 启用参数校验。
public class CaseController {

    // 定义日志对象。
    private static final Logger log = LoggerFactory.getLogger(CaseController.class);
    // 定义案件服务对象。
    private final CaseRecordService caseRecordService;

    /**
     * 构造函数。
     */
    public CaseController(CaseRecordService caseRecordService) {
        // 注入案件服务。
        this.caseRecordService = caseRecordService;
    }

    /**
     * 处理文字案件入库。
     */
    @PostMapping("/ingest/text") // 定义文字入库接口。
    public ApiResponse<CaseRecord> ingestText(@Valid @RequestBody TextIngestRequest request) {
        // 打印请求参数日志。
        log.info("文字入库请求: partyName={}, disputeType={}, riskLevel={}", request.getPartyName(), request.getDisputeType(), request.getRiskLevel());
        // 调用服务执行入库。
        CaseRecord record = caseRecordService.ingestText(request);
        // 打印响应结果日志。
        log.info("文字入库响应: caseNo={}", record.getCaseNo());
        // 返回统一成功响应。
        return ApiResponse.success(record);
    }

    /**
     * 处理Excel案件入库。
     */
    @PostMapping("/ingest/excel") // 定义Excel入库接口。
    public ApiResponse<CaseRecord> ingestExcel(@RequestParam("file") MultipartFile file) {
        // 打印请求文件日志。
        log.info("Excel入库请求: fileName={}", file.getOriginalFilename());
        // 调用服务执行入库。
        CaseRecord record = caseRecordService.ingestExcel(file);
        // 打印响应结果日志。
        log.info("Excel入库响应: caseNo={}", record.getCaseNo());
        // 返回统一成功响应。
        return ApiResponse.success(record);
    }

    /**
     * 处理音频案件入库。
     */
    @PostMapping("/ingest/audio") // 定义音频入库接口。
    public ApiResponse<CaseRecord> ingestAudio(@RequestParam("file") MultipartFile file) {
        // 打印请求文件日志。
        log.info("音频入库请求: fileName={}", file.getOriginalFilename());
        // 调用服务执行入库。
        CaseRecord record = caseRecordService.ingestAudio(file);
        // 打印响应结果日志。
        log.info("音频入库响应: caseNo={}", record.getCaseNo());
        // 返回统一成功响应。
        return ApiResponse.success(record);
    }

    /**
     * 查询案件分页数据。
     */
    @GetMapping // 定义查询接口。
    public ApiResponse<IPage<CaseRecord>> queryCases(CaseQueryRequest request) {
        // 打印查询请求日志。
        log.info("案件查询请求: keyword={}, disputeType={}, eventSource={}, riskLevel={}, pageNo={}, pageSize={}",
                request.getKeyword(), request.getDisputeType(), request.getEventSource(), request.getRiskLevel(), request.getPageNo(), request.getPageSize());
        // 调用服务执行查询。
        IPage<CaseRecord> pageData = caseRecordService.queryCases(request);
        // 打印查询响应日志。
        log.info("案件查询响应: total={}, size={}", pageData.getTotal(), pageData.getSize());
        // 返回统一成功响应。
        return ApiResponse.success(pageData);
    }
}

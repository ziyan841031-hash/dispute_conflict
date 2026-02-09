package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.dto.CaseQueryRequest;
import com.example.dispute.dto.TextIngestRequest;
import com.example.dispute.entity.CaseRecord;
import com.example.dispute.service.CaseRecordService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/cases")
@Validated
public class CaseController {

    private final CaseRecordService caseRecordService;

    public CaseController(CaseRecordService caseRecordService) {
        this.caseRecordService = caseRecordService;
    }

    @PostMapping("/ingest/text")
    public ApiResponse<CaseRecord> ingestText(@Valid @RequestBody TextIngestRequest request) {
        return ApiResponse.success(caseRecordService.ingestText(request));
    }

    @PostMapping("/ingest/excel")
    public ApiResponse<CaseRecord> ingestExcel(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success(caseRecordService.ingestExcel(file));
    }

    @PostMapping("/ingest/audio")
    public ApiResponse<CaseRecord> ingestAudio(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success(caseRecordService.ingestAudio(file));
    }

    @GetMapping
    public ApiResponse<IPage<CaseRecord>> queryCases(CaseQueryRequest request) {
        return ApiResponse.success(caseRecordService.queryCases(request));
    }
}

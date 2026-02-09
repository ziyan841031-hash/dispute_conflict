package com.example.dispute.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.example.dispute.dto.CaseQueryRequest;
import com.example.dispute.dto.TextIngestRequest;
import com.example.dispute.entity.CaseRecord;
import org.springframework.web.multipart.MultipartFile;

public interface CaseRecordService {

    CaseRecord ingestText(TextIngestRequest request);

    CaseRecord ingestExcel(MultipartFile file);

    CaseRecord ingestAudio(MultipartFile file);

    IPage<CaseRecord> queryCases(CaseQueryRequest request);

    Object intelligentClassify(TextIngestRequest request);
}

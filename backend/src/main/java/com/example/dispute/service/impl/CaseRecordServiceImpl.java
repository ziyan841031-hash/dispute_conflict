package com.example.dispute.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.dispute.dto.CaseQueryRequest;
import com.example.dispute.entity.CaseRecord;
import com.example.dispute.mapper.CaseRecordMapper;
import com.example.dispute.service.CaseRecordService;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.StringJoiner;
import java.util.UUID;

@Service
public class CaseRecordServiceImpl implements CaseRecordService {

    private final CaseRecordMapper caseRecordMapper;

    public CaseRecordServiceImpl(CaseRecordMapper caseRecordMapper) {
        this.caseRecordMapper = caseRecordMapper;
    }

    @Override
    public CaseRecord ingestText(String caseText) {
        return saveCase("TEXT", caseText, null, null);
    }

    @Override
    public CaseRecord ingestExcel(MultipartFile file) {
        String parsedText = parseExcelToText(file);
        return saveCase("EXCEL", parsedText, file.getOriginalFilename(), null);
    }

    @Override
    public CaseRecord ingestAudio(MultipartFile file) {
        String parsedText = "[音频转写占位] 文件 " + file.getOriginalFilename() + " 已上传，待接入ASR模型后自动转写";
        return saveCase("AUDIO", parsedText, file.getOriginalFilename(), 0);
    }

    @Override
    public IPage<CaseRecord> queryCases(CaseQueryRequest request) {
        Page<CaseRecord> page = new Page<>(request.getPageNo(), request.getPageSize());
        LambdaQueryWrapper<CaseRecord> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(request.getKeyword())) {
            wrapper.like(CaseRecord::getCaseText, request.getKeyword());
        }
        if (StringUtils.hasText(request.getSourceType())) {
            wrapper.eq(CaseRecord::getSourceType, request.getSourceType());
        }
        wrapper.orderByDesc(CaseRecord::getCreatedAt);
        return caseRecordMapper.selectPage(page, wrapper);
    }

    private CaseRecord saveCase(String sourceType, String parsedText, String fileName, Integer audioDurationSec) {
        CaseRecord record = new CaseRecord();
        record.setCaseNo("CASE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        record.setSourceType(sourceType);
        record.setCaseText(parsedText);
        record.setSourceFileName(fileName);
        record.setAudioDurationSec(audioDurationSec);
        record.setStatus("NEW");
        record.setCreatedAt(LocalDateTime.now());
        record.setUpdatedAt(LocalDateTime.now());
        caseRecordMapper.insert(record);
        return record;
    }

    private String parseExcelToText(MultipartFile file) {
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            StringJoiner text = new StringJoiner("\n");
            for (Row row : sheet) {
                StringJoiner rowText = new StringJoiner(" | ");
                for (Cell cell : row) {
                    rowText.add(cell.toString());
                }
                text.add(rowText.toString());
            }
            return text.toString();
        } catch (IOException ex) {
            throw new IllegalArgumentException("Excel解析失败: " + ex.getMessage(), ex);
        }
    }
}

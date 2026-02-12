package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.entity.CaseStatsBatch;
import com.example.dispute.entity.CaseStatsDetail;
import com.example.dispute.mapper.CaseStatsBatchMapper;
import com.example.dispute.mapper.CaseStatsDetailMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.Row.MissingCellPolicy;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/case-stats")
public class CaseStatsController {

    private static final List<String> REQUIRED_HEADERS = Arrays.asList("序号", "时间", "区", "街镇", "登记来源", "类型", "登记时间", "当前办理状态");

    private final CaseStatsBatchMapper batchMapper;
    private final CaseStatsDetailMapper detailMapper;

    public CaseStatsController(CaseStatsBatchMapper batchMapper, CaseStatsDetailMapper detailMapper) {
        this.batchMapper = batchMapper;
        this.detailMapper = detailMapper;
    }

    @PostMapping("/import-excel")
    public ApiResponse<Map<String, Object>> importExcel(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ApiResponse.fail("请上传Excel文件");
        }

        List<CaseStatsDetail> details = new ArrayList<>();
        try (InputStream inputStream = file.getInputStream(); Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() < 2) {
                return ApiResponse.fail("Excel内容为空");
            }
            Row headerRow = sheet.getRow(0);
            if (!validateHeader(headerRow)) {
                return ApiResponse.fail("Excel表头不符合要求，应为：序号，时间，区，街镇，登记来源，类型，登记时间，当前办理状态");
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isEmptyRow(row)) {
                    continue;
                }
                CaseStatsDetail detail = new CaseStatsDetail();
                detail.setSerialNo(cellString(row, 0));
                detail.setEventTime(cellString(row, 1));
                detail.setDistrict(cellString(row, 2));
                detail.setStreetTown(cellString(row, 3));
                detail.setRegisterSource(cellString(row, 4));
                detail.setCaseType(cellString(row, 5));
                detail.setRegisterTime(cellString(row, 6));
                detail.setCurrentStatus(cellString(row, 7));
                detail.setCreatedAt(LocalDateTime.now());
                details.add(detail);
            }
        } catch (Exception ex) {
            return ApiResponse.fail("Excel解析失败: " + ex.getMessage());
        }

        if (details.isEmpty()) {
            return ApiResponse.fail("Excel未解析到有效明细记录");
        }

        LocalDateTime now = LocalDateTime.now();
        String batchNo = "BATCH-" + now.format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        CaseStatsBatch batch = new CaseStatsBatch();
        batch.setBatchNo(batchNo);
        batch.setRecordCount(details.size());
        batch.setImportedAt(now);
        batch.setCreatedAt(now);
        batchMapper.insert(batch);

        for (CaseStatsDetail detail : details) {
            detail.setBatchId(batch.getId());
            detailMapper.insert(detail);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("batchNo", batchNo);
        result.put("recordCount", details.size());
        result.put("importedAt", now);
        return ApiResponse.success(result);
    }

    @GetMapping("/batches")
    public ApiResponse<List<CaseStatsBatch>> listBatches() {
        List<CaseStatsBatch> list = batchMapper.selectList(new LambdaQueryWrapper<CaseStatsBatch>()
                .orderByDesc(CaseStatsBatch::getImportedAt));
        return ApiResponse.success(list);
    }

    @GetMapping("/batches/{batchId}/details")
    public ApiResponse<List<CaseStatsDetail>> listDetails(@PathVariable("batchId") Long batchId) {
        List<CaseStatsDetail> list = detailMapper.selectList(new LambdaQueryWrapper<CaseStatsDetail>()
                .eq(CaseStatsDetail::getBatchId, batchId)
                .orderByAsc(CaseStatsDetail::getId));
        return ApiResponse.success(list);
    }

    private boolean validateHeader(Row headerRow) {
        if (headerRow == null) {
            return false;
        }
        for (int i = 0; i < REQUIRED_HEADERS.size(); i++) {
            String header = cellString(headerRow, i);
            if (!REQUIRED_HEADERS.get(i).equals(header)) {
                return false;
            }
        }
        return true;
    }

    private String cellString(Row row, int index) {
        Cell cell = row.getCell(index, MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) {
            return "";
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            if (DateUtil.isCellDateFormatted(cell)) {
                return cell.getLocalDateTimeCellValue().toString();
            }
            return BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
        }
        if (cell.getCellType() == CellType.BOOLEAN) {
            return String.valueOf(cell.getBooleanCellValue());
        }
        return cell.toString().trim();
    }

    private boolean isEmptyRow(Row row) {
        for (int i = 0; i < REQUIRED_HEADERS.size(); i++) {
            if (!cellString(row, i).isEmpty()) {
                return false;
            }
        }
        return true;
    }
}

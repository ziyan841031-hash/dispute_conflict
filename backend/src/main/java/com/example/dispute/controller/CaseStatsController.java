package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.entity.CaseStatsBatch;
import com.example.dispute.entity.CaseStatsDetail;
import com.example.dispute.mapper.CaseStatsBatchMapper;
import com.example.dispute.mapper.CaseStatsDetailMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.sl.usermodel.PictureData;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.usermodel.Row.MissingCellPolicy;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFPictureData;
import org.apache.poi.xslf.usermodel.XSLFPictureShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/case-stats")
public class CaseStatsController {

    private static final List<String> REQUIRED_HEADERS = Arrays.asList("序号", "时间", "区", "街镇", "登记来源", "类型", "登记时间", "当前办理状态");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4})[-/](\\d{1,2})");

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

        Map<String, Object> analysis = buildAnalysis(details);
        Map<String, String> files = generateChartsAndPpt(batch, analysis);

        batch.setReportGeneratedAt(LocalDateTime.now());
        batch.setReportFileUrl("/api/case-stats/batches/" + batch.getId() + "/report-download");
        batch.setTimeTrendJson(toJson(analysis.get("timeTrend")));
        batch.setStreetTop10Json(toJson(analysis.get("streetTop10")));
        batch.setTypeTop10Json(toJson(analysis.get("typeTop10")));
        batch.setDistrictStatusJson(toJson(analysis.get("districtStatus")));
        batch.setTimeChartPath(files.get("timeChartPath"));
        batch.setStreetChartPath(files.get("streetChartPath"));
        batch.setTypeChartPath(files.get("typeChartPath"));
        batch.setDistrictChartPath(files.get("districtChartPath"));
        batch.setReportFilePath(files.get("pptPath"));
        batchMapper.updateById(batch);

        Map<String, Object> result = new HashMap<>();
        result.put("batchNo", batchNo);
        result.put("recordCount", details.size());
        result.put("importedAt", now);
        result.put("timeTrendJson", batch.getTimeTrendJson());
        result.put("streetTop10Json", batch.getStreetTop10Json());
        result.put("typeTop10Json", batch.getTypeTop10Json());
        result.put("districtStatusJson", batch.getDistrictStatusJson());
        result.put("timeChartPath", batch.getTimeChartPath());
        result.put("streetChartPath", batch.getStreetChartPath());
        result.put("typeChartPath", batch.getTypeChartPath());
        result.put("districtChartPath", batch.getDistrictChartPath());
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

    @GetMapping("/batches/{batchId}/analysis")
    public ApiResponse<Map<String, Object>> getAnalysis(@PathVariable("batchId") Long batchId) {
        CaseStatsBatch batch = batchMapper.selectById(batchId);
        if (batch == null) {
            return ApiResponse.fail("批次不存在");
        }
        Map<String, Object> result = new HashMap<>();
        result.put("timeTrendJson", batch.getTimeTrendJson());
        result.put("streetTop10Json", batch.getStreetTop10Json());
        result.put("typeTop10Json", batch.getTypeTop10Json());
        result.put("districtStatusJson", batch.getDistrictStatusJson());
        result.put("timeChartPath", batch.getTimeChartPath());
        result.put("streetChartPath", batch.getStreetChartPath());
        result.put("typeChartPath", batch.getTypeChartPath());
        result.put("districtChartPath", batch.getDistrictChartPath());
        result.put("reportFileUrl", batch.getReportFileUrl());
        return ApiResponse.success(result);
    }

    @GetMapping("/batches/{batchId}/report-download")
    public ResponseEntity<Resource> downloadReport(@PathVariable("batchId") Long batchId) {
        CaseStatsBatch batch = batchMapper.selectById(batchId);
        if (batch == null || batch.getReportFilePath() == null || batch.getReportFilePath().trim().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        File file = new File(batch.getReportFilePath());
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + file.getName())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    private Map<String, Object> buildAnalysis(List<CaseStatsDetail> details) {
        Map<String, Object> result = new LinkedHashMap<>();

        List<String> monthKeys = new ArrayList<>();
        YearMonth nowMonth = YearMonth.now();
        for (int i = 5; i >= 0; i--) {
            monthKeys.add(nowMonth.minusMonths(i).toString());
        }
        Map<String, Long> monthMap = new LinkedHashMap<>();
        for (String key : monthKeys) {
            monthMap.put(key, 0L);
        }
        for (CaseStatsDetail d : details) {
            String month = extractMonth(d.getRegisterTime(), d.getEventTime());
            if (monthMap.containsKey(month)) {
                monthMap.put(month, monthMap.get(month) + 1);
            }
        }
        result.put("timeTrend", monthMap);

        result.put("streetTop10", topNMap(details.stream()
                .collect(Collectors.groupingBy(item -> safe(item.getStreetTown()), Collectors.counting())), 10));

        result.put("typeTop10", topNMap(details.stream()
                .collect(Collectors.groupingBy(item -> safe(item.getCaseType()), Collectors.counting())), 10));

        Map<String, Map<String, Long>> districtStatus = new LinkedHashMap<>();
        for (CaseStatsDetail d : details) {
            String district = safe(d.getDistrict());
            String status = safe(d.getCurrentStatus());
            if (!districtStatus.containsKey(district)) {
                districtStatus.put(district, new LinkedHashMap<String, Long>());
            }
            Map<String, Long> statusMap = districtStatus.get(district);
            statusMap.put(status, statusMap.getOrDefault(status, 0L) + 1);
        }
        result.put("districtStatus", districtStatus);
        return result;
    }

    private Map<String, String> generateChartsAndPpt(CaseStatsBatch batch, Map<String, Object> analysis) {
        try {
            Path dir = Paths.get("backend", "reports", batch.getBatchNo());
            Files.createDirectories(dir);
            String timeChartPath = dir.resolve("time-trend.png").toString();
            String streetChartPath = dir.resolve("street-top10.png").toString();
            String typeChartPath = dir.resolve("type-top10.png").toString();
            String districtChartPath = dir.resolve("district-status.png").toString();
            String pptPath = dir.resolve("case-stats-report.pptx").toString();

            drawLineChart("近6个月趋势", ((Map<String, Long>) analysis.get("timeTrend")), timeChartPath);
            drawVerticalBarChart("街镇高发Top10", ((Map<String, Long>) analysis.get("streetTop10")), streetChartPath);
            drawHorizontalBarChart("类型高发Top10", ((Map<String, Long>) analysis.get("typeTop10")), typeChartPath);
            drawGroupedBarChart("区办理状态", ((Map<String, Map<String, Long>>) analysis.get("districtStatus")), districtChartPath);
            buildPpt(pptPath, timeChartPath, streetChartPath, typeChartPath, districtChartPath);

            Map<String, String> files = new HashMap<>();
            files.put("timeChartPath", timeChartPath);
            files.put("streetChartPath", streetChartPath);
            files.put("typeChartPath", typeChartPath);
            files.put("districtChartPath", districtChartPath);
            files.put("pptPath", pptPath);
            return files;
        } catch (Exception ex) {
            throw new RuntimeException("报告生成失败: " + ex.getMessage(), ex);
        }
    }

    private void buildPpt(String pptPath, String... images) throws Exception {
        XMLSlideShow ppt = new XMLSlideShow();
        for (String image : images) {
            XSLFSlide slide = ppt.createSlide();
            byte[] bytes = Files.readAllBytes(Paths.get(image));
            XSLFPictureData pd = ppt.addPicture(bytes, PictureData.PictureType.PNG);
            XSLFPictureShape pic = slide.createPicture(pd);
            pic.setAnchor(new java.awt.Rectangle(40, 40, 880, 500));
        }
        try (FileOutputStream out = new FileOutputStream(pptPath)) {
            ppt.write(out);
        }
        ppt.close();
    }

    private void drawLineChart(String title, Map<String, Long> data, String output) throws Exception {
        BufferedImage img = createCanvas(title);
        Graphics2D g = img.createGraphics();
        setupGraphics(g);
        int left = 100, right = 1080, top = 100, bottom = 620;
        drawAxis(g, left, top, right, bottom);
        long max = Math.max(1L, data.values().stream().mapToLong(Long::longValue).max().orElse(1L));
        List<String> labels = new ArrayList<>(data.keySet());
        int n = labels.size();
        int prevX = -1, prevY = -1;
        g.setColor(new Color(37, 99, 235));
        for (int i = 0; i < n; i++) {
            int x = left + (right - left) * i / Math.max(1, n - 1);
            int y = bottom - (int) ((bottom - top) * (data.get(labels.get(i)) * 1.0 / max));
            g.fillOval(x - 4, y - 4, 8, 8);
            if (prevX >= 0) {
                g.drawLine(prevX, prevY, x, y);
            }
            prevX = x;
            prevY = y;
            g.setColor(Color.DARK_GRAY);
            g.drawString(labels.get(i), x - 20, bottom + 24);
            g.setColor(new Color(37, 99, 235));
        }
        ImageIO.write(img, "png", new File(output));
        g.dispose();
    }

    private void drawVerticalBarChart(String title, Map<String, Long> data, String output) throws Exception {
        BufferedImage img = createCanvas(title);
        Graphics2D g = img.createGraphics();
        setupGraphics(g);
        int left = 120, right = 1100, top = 100, bottom = 620;
        drawAxis(g, left, top, right, bottom);
        long max = Math.max(1L, data.values().stream().mapToLong(Long::longValue).max().orElse(1L));
        List<Map.Entry<String, Long>> entries = new ArrayList<>(data.entrySet());
        int n = Math.max(1, entries.size());
        int barW = Math.max(20, (right - left) / (n * 2));
        int gap = barW;
        int x = left + 20;
        for (Map.Entry<String, Long> entry : entries) {
            int h = (int) ((bottom - top) * (entry.getValue() * 1.0 / max));
            g.setColor(new Color(59, 130, 246));
            g.fillRect(x, bottom - h, barW, h);
            g.setColor(Color.DARK_GRAY);
            g.drawString(entry.getKey(), x - 8, bottom + 20);
            x += barW + gap;
        }
        ImageIO.write(img, "png", new File(output));
        g.dispose();
    }

    private void drawHorizontalBarChart(String title, Map<String, Long> data, String output) throws Exception {
        BufferedImage img = createCanvas(title);
        Graphics2D g = img.createGraphics();
        setupGraphics(g);
        int left = 280, right = 1120, top = 100, bottom = 620;
        drawAxis(g, left, top, right, bottom);
        long max = Math.max(1L, data.values().stream().mapToLong(Long::longValue).max().orElse(1L));
        List<Map.Entry<String, Long>> entries = new ArrayList<>(data.entrySet());
        int n = Math.max(1, entries.size());
        int barH = Math.max(18, (bottom - top) / (n * 2));
        int gap = barH;
        int y = top + 20;
        for (Map.Entry<String, Long> entry : entries) {
            int w = (int) ((right - left) * (entry.getValue() * 1.0 / max));
            g.setColor(new Color(14, 165, 233));
            g.fillRect(left, y, w, barH);
            g.setColor(Color.DARK_GRAY);
            g.drawString(entry.getKey(), 80, y + barH - 2);
            y += barH + gap;
        }
        ImageIO.write(img, "png", new File(output));
        g.dispose();
    }

    private void drawGroupedBarChart(String title, Map<String, Map<String, Long>> data, String output) throws Exception {
        BufferedImage img = createCanvas(title);
        Graphics2D g = img.createGraphics();
        setupGraphics(g);
        int left = 100, right = 1120, top = 100, bottom = 620;
        drawAxis(g, left, top, right, bottom);
        Set<String> statusSet = new LinkedHashSet<String>();
        for (Map<String, Long> m : data.values()) {
            statusSet.addAll(m.keySet());
        }
        List<String> statuses = new ArrayList<String>(statusSet);
        List<String> districts = new ArrayList<String>(data.keySet());
        long max = 1L;
        for (String d : districts) {
            for (String s : statuses) {
                max = Math.max(max, data.get(d).getOrDefault(s, 0L));
            }
        }
        int groupW = Math.max(40, (right - left) / Math.max(1, districts.size()));
        int barW = Math.max(8, groupW / Math.max(1, statuses.size() + 1));
        Color[] colors = {new Color(37, 99, 235), new Color(14, 165, 233), new Color(249, 115, 22), new Color(34, 197, 94)};
        for (int i = 0; i < districts.size(); i++) {
            int gx = left + i * groupW + 8;
            String district = districts.get(i);
            g.setColor(Color.DARK_GRAY);
            g.drawString(district, gx, bottom + 20);
            for (int j = 0; j < statuses.size(); j++) {
                long v = data.get(district).getOrDefault(statuses.get(j), 0L);
                int h = (int) ((bottom - top) * (v * 1.0 / max));
                g.setColor(colors[j % colors.length]);
                g.fillRect(gx + j * barW, bottom - h, barW - 2, h);
            }
        }
        ImageIO.write(img, "png", new File(output));
        g.dispose();
    }

    private BufferedImage createCanvas(String title) {
        BufferedImage img = new BufferedImage(1200, 700, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, img.getWidth(), img.getHeight());
        g.setColor(Color.BLACK);
        g.setFont(new Font("Microsoft YaHei", Font.BOLD, 30));
        g.drawString(title, 30, 50);
        g.dispose();
        return img;
    }

    private void setupGraphics(Graphics2D g) {
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setFont(new Font("Microsoft YaHei", Font.PLAIN, 14));
    }

    private void drawAxis(Graphics2D g, int left, int top, int right, int bottom) {
        g.setColor(new Color(100, 116, 139));
        g.drawLine(left, bottom, right, bottom);
        g.drawLine(left, top, left, bottom);
    }

    private String extractMonth(String registerTime, String eventTime) {
        String source = (registerTime == null || registerTime.trim().isEmpty()) ? eventTime : registerTime;
        if (source == null) {
            return "";
        }
        Matcher matcher = DATE_PATTERN.matcher(source);
        if (matcher.find()) {
            int year = Integer.parseInt(matcher.group(1));
            int month = Integer.parseInt(matcher.group(2));
            return String.format("%04d-%02d", year, month);
        }
        try {
            LocalDate date = LocalDate.parse(source);
            return YearMonth.from(date).toString();
        } catch (DateTimeParseException ex) {
            return "";
        }
    }

    private Map<String, Long> topNMap(Map<String, Long> map, int n) {
        return map.entrySet().stream()
                .filter(e -> e.getKey() != null && !e.getKey().trim().isEmpty())
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(n)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }

    private String toJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
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

    private String safe(String value) {
        return value == null || value.trim().isEmpty() ? "未知" : value.trim();
    }
}

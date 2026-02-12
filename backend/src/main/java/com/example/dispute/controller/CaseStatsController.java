package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.dispute.client.DifyClient;
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
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.apache.poi.xslf.usermodel.XSLFTextParagraph;
import org.apache.poi.xslf.usermodel.XSLFTextRun;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;

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
import java.nio.charset.StandardCharsets;
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

/**
 * 案件统计控制器。
 * 提供Excel导入、批次查询、明细查询、统计分析与PPT报告下载能力。
 */
@RestController
@RequestMapping("/api/case-stats")
public class CaseStatsController {

    private static final List<String> REQUIRED_HEADERS = Arrays.asList("序号", "时间", "区", "街镇", "登记来源", "类型", "登记时间", "当前办理状态");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4})[-/](\\d{1,2})");

    private final CaseStatsBatchMapper batchMapper;
    private final CaseStatsDetailMapper detailMapper;
    private final DifyClient difyClient;

    @Value("${dify.case-stats-api-key:replace-with-case-stats-key}")
    private String caseStatsApiKey;

    public CaseStatsController(CaseStatsBatchMapper batchMapper, CaseStatsDetailMapper detailMapper, DifyClient difyClient) {
        this.batchMapper = batchMapper;
        this.detailMapper = detailMapper;
        this.difyClient = difyClient;
    }

    /**
     * 导入案件统计Excel并完成入库、统计分析、图表渲染和PPT生成。
     */
    @PostMapping("/import-excel")
    public ApiResponse<Map<String, Object>> importExcel(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ApiResponse.fail("请上传Excel文件");
        }

        // 定义解析后的明细列表。
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

        // 生成四维度统计数据。
        Map<String, Object> analysis = buildAnalysis(details);
        // 渲染图表并生成PPT文件。
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

    /**
     * 查询案件统计批次列表。
     */
    @GetMapping("/batches")
    public ApiResponse<List<CaseStatsBatch>> listBatches() {
        List<CaseStatsBatch> list = batchMapper.selectList(new LambdaQueryWrapper<CaseStatsBatch>()
                .orderByDesc(CaseStatsBatch::getImportedAt));
        return ApiResponse.success(list);
    }

    /**
     * 查询指定批次的明细数据。
     */
    @GetMapping("/batches/{batchId}/details")
    public ApiResponse<List<CaseStatsDetail>> listDetails(@PathVariable("batchId") Long batchId) {
        List<CaseStatsDetail> list = detailMapper.selectList(new LambdaQueryWrapper<CaseStatsDetail>()
                .eq(CaseStatsDetail::getBatchId, batchId)
                .orderByAsc(CaseStatsDetail::getId));
        return ApiResponse.success(list);
    }

    /**
     * 查询指定批次的统计分析JSON与图表路径。
     */
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

    /**
     * 下载指定批次生成的报告文件。
     */
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
        String encodedName = UriUtils.encode(file.getName(), StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.getName() + "\"; filename*=UTF-8''" + encodedName)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation"))
                .body(resource);
    }

    /**
     * 基于明细列表构建四个维度统计分析数据。
     */
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

    /**
     * 将统计结果渲染为统一尺寸图片，并调用Dify生成文字摘要后输出PPT。
     */
    private Map<String, String> generateChartsAndPpt(CaseStatsBatch batch, Map<String, Object> analysis) {
        try {
            // 按批次号创建报告输出目录。
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

            Map<String, String> aiSummary = callDifyForCaseStatsSummary(analysis);
            buildPpt(pptPath, aiSummary, timeChartPath, streetChartPath, typeChartPath, districtChartPath);

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

    /**
     * 调用Dify工作流生成四个维度的标题与摘要。
     */
    private Map<String, String> callDifyForCaseStatsSummary(Map<String, Object> analysis) {
        Map<String, String> result = new HashMap<>();
        result.put("month_title", "近6个月纠纷量趋势分析");
        result.put("month_summary", "1）近6个月纠纷量变化见图；2）建议结合环比变化持续跟踪重点月份。");
        result.put("street_title", "街镇高发案分布分析");
        result.put("street_summary", "1）街镇高发Top10见图；2）建议对高发街镇开展专项治理。");
        result.put("type_title", "纠纷类型分布分析");
        result.put("type_summary", "1）类型高发Top10见图；2）建议聚焦头部类型强化源头治理。");
        result.put("district_title", "各区办理状态分布分析");
        result.put("district_summary", "1）各区办理状态分布见图；2）建议跟踪办理中事项提升闭环效率。");
        try {
            Map<String, Object> inputs = new HashMap<>();
            inputs.put("monthly_trend_json", toJson(analysis.get("timeTrend")));
            inputs.put("street_top10_json", toJson(analysis.get("streetTop10")));
            inputs.put("type_top10_json", toJson(analysis.get("typeTop10")));
            inputs.put("district_status_json", toJson(analysis.get("districtStatus")));
            Object response = difyClient.runWorkflowWithInputs(inputs, caseStatsApiKey, "案件统计摘要");
            if (response instanceof Map) {
                Object outputs = ((Map<?, ?>) response).get("outputs");
                if (outputs instanceof Map) {
                    Map<?, ?> map = (Map<?, ?>) outputs;
                    mergeSummaryField(result, map, "month_title");
                    mergeSummaryField(result, map, "month_summary");
                    mergeSummaryField(result, map, "street_title");
                    mergeSummaryField(result, map, "street_summary");
                    mergeSummaryField(result, map, "type_title");
                    mergeSummaryField(result, map, "type_summary");
                    mergeSummaryField(result, map, "district_title");
                    mergeSummaryField(result, map, "district_summary");
                }
            }
        } catch (Exception ex) {
            // Dify异常时使用默认文案兜底，不影响报告生成。
        }
        return result;
    }

    /**
     * 从Dify输出中合并指定字段。
     */
    private void mergeSummaryField(Map<String, String> target, Map<?, ?> source, String key) {
        Object value = source.get(key);
        if (value != null && !value.toString().trim().isEmpty()) {
            target.put(key, value.toString().trim());
        }
    }

    /**
     * 将标题、分段摘要和图表排版到PPT（四页）。
     */
    private void buildPpt(String pptPath, Map<String, String> summary, String timeChartPath, String streetChartPath,
                          String typeChartPath, String districtChartPath) throws Exception {
        XMLSlideShow ppt = new XMLSlideShow();
        ppt.setPageSize(new java.awt.Dimension(PPT_WIDTH, PPT_HEIGHT));
        addPptSlide(ppt, summary.get("month_title"), summary.get("month_summary"), timeChartPath);
        addPptSlide(ppt, summary.get("street_title"), summary.get("street_summary"), streetChartPath);
        addPptSlide(ppt, summary.get("type_title"), summary.get("type_summary"), typeChartPath);
        addPptSlide(ppt, summary.get("district_title"), summary.get("district_summary"), districtChartPath);
        try (FileOutputStream out = new FileOutputStream(pptPath)) {
            ppt.write(out);
        }
        ppt.close();
    }

    /**
     * 单页排版：标题+摘要（按“；”拆分并自动换行）+自适应图表。
     */
    private void addPptSlide(XMLSlideShow ppt, String title, String summary, String chartPath) throws Exception {
        XSLFSlide slide = ppt.createSlide();

        // 标题区。
        int titleHeight = 58;
        XSLFTextBox titleBox = slide.createTextBox();
        titleBox.setAnchor(new java.awt.Rectangle(MARGIN, 16, PPT_WIDTH - MARGIN * 2, titleHeight));
        XSLFTextParagraph titleP = titleBox.addNewTextParagraph();
        XSLFTextRun titleR = titleP.addNewTextRun();
        titleR.setText(title == null ? "" : title.trim());
        titleR.setFontFamily("Microsoft YaHei");
        titleR.setBold(true);
        titleR.setFontSize(30.0);

        // 摘要区（最大高度受控，超出时自动截断并追加省略标记）。
        int summaryTop = 86;
        int summaryHeight = 180;
        int summaryWidth = PPT_WIDTH - MARGIN * 2;
        XSLFTextBox summaryBox = slide.createTextBox();
        summaryBox.setAnchor(new java.awt.Rectangle(MARGIN, summaryTop, summaryWidth, summaryHeight));

        java.awt.Font summaryFont = new java.awt.Font("Microsoft YaHei", java.awt.Font.PLAIN, 20);
        int maxLineWidthPx = summaryWidth - 20;
        int maxLines = 7;
        int usedLines = 0;
        String[] paragraphs = (summary == null ? "" : summary).split("；");
        for (int i = 0; i < paragraphs.length; i++) {
            String text = paragraphs[i] == null ? "" : paragraphs[i].trim();
            if (text.isEmpty()) {
                continue;
            }
            List<String> lines = wrapTextByPixel(text, summaryFont, maxLineWidthPx);
            for (String line : lines) {
                if (usedLines >= maxLines) {
                    break;
                }
                XSLFTextParagraph para = summaryBox.addNewTextParagraph();
                XSLFTextRun run = para.addNewTextRun();
                run.setText(line);
                run.setFontFamily("Microsoft YaHei");
                run.setFontSize(18.0);
                usedLines++;
            }
            if (usedLines >= maxLines) {
                break;
            }
        }
        if (usedLines >= maxLines) {
            XSLFTextParagraph para = summaryBox.addNewTextParagraph();
            XSLFTextRun run = para.addNewTextRun();
            run.setText("……");
            run.setFontFamily("Microsoft YaHei");
            run.setFontSize(18.0);
        }

        // 图表区：按比例缩放并居中，保证不超出幻灯片。
        BufferedImage chart = ImageIO.read(new File(chartPath));
        int imageTop = summaryTop + summaryHeight + 16;
        int imageMaxW = PPT_WIDTH - MARGIN * 2;
        int imageMaxH = PPT_HEIGHT - imageTop - 20;
        double scale = Math.min(imageMaxW * 1.0 / chart.getWidth(), imageMaxH * 1.0 / chart.getHeight());
        scale = Math.min(scale, 1.0);
        int imageW = Math.max(1, (int) Math.round(chart.getWidth() * scale));
        int imageH = Math.max(1, (int) Math.round(chart.getHeight() * scale));
        int imageX = (PPT_WIDTH - imageW) / 2;

        byte[] bytes = Files.readAllBytes(Paths.get(chartPath));
        XSLFPictureData pd = ppt.addPicture(bytes, PictureData.PictureType.PNG);
        XSLFPictureShape pic = slide.createPicture(pd);
        pic.setAnchor(new java.awt.Rectangle(imageX, imageTop, imageW, imageH));
    }

    /**
     * 根据像素宽度对文本换行，避免中文段落超出文本框。
     */
    private List<String> wrapTextByPixel(String text, java.awt.Font font, int maxWidthPx) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.trim().isEmpty()) {
            return lines;
        }
        BufferedImage img = new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setFont(font);
        java.awt.FontMetrics metrics = g.getFontMetrics();

        StringBuilder current = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            current.append(ch);
            if (metrics.stringWidth(current.toString()) > maxWidthPx) {
                current.deleteCharAt(current.length() - 1);
                if (current.length() > 0) {
                    lines.add(current.toString());
                    current.setLength(0);
                }
                current.append(ch);
            }
        }
        if (current.length() > 0) {
            lines.add(current.toString());
        }
        g.dispose();
        return lines;
    }

    /**
     * 绘制折线图（近6个月趋势）。
     */
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

    /**
     * 绘制竖向柱状图（Top10）。
     */
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

    /**
     * 绘制横向柱状图（Top10）。
     */
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

    /**
     * 绘制分组柱状图（区+办理状态）。
     */
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

    /**
     * 创建统一尺寸图表画布并绘制标题。
     */
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

    /**
     * 设置图形渲染参数与默认字体。
     */
    private void setupGraphics(Graphics2D g) {
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setFont(new Font("Microsoft YaHei", Font.PLAIN, 14));
    }

    /**
     * 绘制坐标轴。
     */
    private void drawAxis(Graphics2D g, int left, int top, int right, int bottom) {
        g.setColor(new Color(100, 116, 139));
        g.drawLine(left, bottom, right, bottom);
        g.drawLine(left, top, left, bottom);
    }

    /**
     * 从登记时间或事件时间提取“yyyy-MM”月份键。
     */
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

    /**
     * 对统计映射按数量降序取前N条。
     */
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

    /**
     * 将对象序列化为JSON字符串。
     */
    private String toJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }

    /**
     * 校验Excel表头是否符合预期顺序与名称。
     */
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

    /**
     * 读取单元格并统一转换为字符串。
     */
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

    /**
     * 判断当前行是否为空行。
     */
    private boolean isEmptyRow(Row row) {
        for (int i = 0; i < REQUIRED_HEADERS.size(); i++) {
            if (!cellString(row, i).isEmpty()) {
                return false;
            }
        }
        return true;
    }

    /**
     * 统一空值处理，返回“未知”。
     */
    private String safe(String value) {
        return value == null || value.trim().isEmpty() ? "未知" : value.trim();
    }
}

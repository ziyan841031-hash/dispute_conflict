package com.example.dispute.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class ArchiveReportPdfUtil {

    private static final Logger log = LoggerFactory.getLogger(ArchiveReportPdfUtil.class);
    private static final Path OUTPUT_DIR = Paths.get("generated-docs", "archive-reports").toAbsolutePath().normalize();
    private static final float FONT_SIZE = 12F;
    private static final float LEADING = 18F;
    private static final float MARGIN = 48F;
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private ArchiveReportPdfUtil() {
    }

    public static String generateArchiveReportPdfPath(Long caseId,
                                                      String archiveSummary,
                                                      String factsProcess,
                                                      String responsibilitySplit) throws IOException {
        String content = buildContent(archiveSummary, factsProcess, responsibilitySplit);
        if (!StringUtils.hasText(content)) {
            return "";
        }
        Files.createDirectories(OUTPUT_DIR);
        String fileName = "archive-report-" + (caseId == null ? "unknown" : caseId)
                + "-" + TS.format(LocalDateTime.now()) + ".pdf";
        Path filePath = OUTPUT_DIR.resolve(fileName).toAbsolutePath().normalize();

        try (PDDocument document = new PDDocument()) {
            PDFont font = loadFont(document);
            List<String> lines = wrapLines(font, FONT_SIZE, content, PDRectangle.A4.getWidth() - (MARGIN * 2));
            writeLines(document, font, lines);
            document.save(filePath.toFile());
        }
        return filePath.toString();
    }

    private static String buildContent(String archiveSummary, String factsProcess, String responsibilitySplit) {
        List<String> sections = new ArrayList<>();
        appendSection(sections, "归档总结", archiveSummary);
        appendSection(sections, "事实经过", factsProcess);
        appendSection(sections, "责任划分", responsibilitySplit);
        return String.join("\n\n", sections).trim();
    }

    private static void appendSection(List<String> sections, String title, String body) {
        String text = body == null ? "" : body.trim();
        if (!StringUtils.hasText(text)) {
            return;
        }
        sections.add(title + "\n" + text);
    }

    private static PDFont loadFont(PDDocument document) throws IOException {
        List<Path> candidates = Arrays.asList(
                Paths.get("C:/Windows/Fonts/msyh.ttf"),
                Paths.get("C:/Windows/Fonts/simhei.ttf"),
                Paths.get("C:/Windows/Fonts/Deng.ttf"),
                Paths.get("C:/Windows/Fonts/NotoSansSC-VF.ttf")
        );
        for (Path candidate : candidates) {
            if (Files.exists(candidate)) {
                return PDType0Font.load(document, candidate.toFile());
            }
        }
        log.warn("archive report pdf font not found, fallback to Helvetica");
        return PDType1Font.HELVETICA;
    }

    private static void writeLines(PDDocument document, PDFont font, List<String> lines) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        PDPageContentStream stream = new PDPageContentStream(document, page);
        float y = page.getMediaBox().getHeight() - MARGIN;
        stream.setFont(font, FONT_SIZE);
        stream.beginText();
        stream.newLineAtOffset(MARGIN, y);
        for (String line : lines) {
            if (y <= MARGIN) {
                stream.endText();
                stream.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                stream = new PDPageContentStream(document, page);
                stream.setFont(font, FONT_SIZE);
                y = page.getMediaBox().getHeight() - MARGIN;
                stream.beginText();
                stream.newLineAtOffset(MARGIN, y);
            }
            stream.showText(line);
            stream.newLineAtOffset(0, -LEADING);
            y -= LEADING;
        }
        stream.endText();
        stream.close();
    }

    private static List<String> wrapLines(PDFont font, float fontSize, String text, float maxWidth) throws IOException {
        List<String> lines = new ArrayList<>();
        String[] rawLines = String.valueOf(text).split("\r?\n", -1);
        for (String rawLine : rawLines) {
            if (!StringUtils.hasText(rawLine)) {
                lines.add(" ");
                continue;
            }
            StringBuilder current = new StringBuilder();
            for (int i = 0; i < rawLine.length(); i += 1) {
                char ch = rawLine.charAt(i);
                current.append(ch);
                float width = font.getStringWidth(current.toString()) / 1000 * fontSize;
                if (width > maxWidth && current.length() > 1) {
                    char last = current.charAt(current.length() - 1);
                    current.deleteCharAt(current.length() - 1);
                    lines.add(current.toString());
                    current = new StringBuilder().append(last);
                }
            }
            if (current.length() > 0) {
                lines.add(current.toString());
            }
        }
        return lines;
    }
}
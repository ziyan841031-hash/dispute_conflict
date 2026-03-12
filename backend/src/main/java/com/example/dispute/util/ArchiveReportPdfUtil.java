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

import java.awt.*;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
import java.util.stream.Stream;

public final class ArchiveReportPdfUtil {

    private static final Logger log = LoggerFactory.getLogger(ArchiveReportPdfUtil.class);
    private static final Path OUTPUT_DIR = Paths.get("generated-docs", "archive-reports").toAbsolutePath().normalize();
    private static final float FONT_SIZE = 12F;
    private static final float LEADING = 18F;
    private static final float MARGIN = 48F;
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");


    private static final String CHINESE_SAMPLE = "\u4e2d\u6587\u5b57\u4f53\u6d4b\u8bd5";
    private static final String[] PREFERRED_FONT_FAMILIES = {
            "Microsoft YaHei",
            "\u5fae\u8f6f\u96c5\u9ed1",
            "PingFang SC",
            "Noto Sans CJK SC",
            "Noto Sans SC",
            "Source Han Sans SC",
            "WenQuanYi Zen Hei",
            "WenQuanYi Micro Hei",
            "SimHei",
            "SimSun",
            "KaiTi",
            "Arial Unicode MS",
            "Dialog"
    };

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

        try (PDDocument document = new PDDocument();
             PdfChineseFontSupport.LoadedFont loadedFont = PdfChineseFontSupport.loadFont(document)) {
            PDFont font = loadedFont.getFont();
            List<String> lines = wrapLines(font, FONT_SIZE, content, PDRectangle.A4.getWidth() - (MARGIN * 2));
            writeLines(document, font, lines);
            document.save(filePath.toFile());
        }
        return filePath.toString();
    }

    private static String buildContent(String archiveSummary, String factsProcess, String responsibilitySplit) {
        List<String> sections = new ArrayList<>();
        appendSection(sections, "褰掓。鎬荤粨", archiveSummary);
        appendSection(sections, "浜嬪疄缁忚繃", factsProcess);
        appendSection(sections, "璐ｄ换鍒掑垎", responsibilitySplit);
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
        LinkedHashSet<Path> candidates = new LinkedHashSet<>();
        String customFontPath = firstNonBlank(System.getProperty("cjk.font.path"), System.getenv("CJK_FONT_PATH"));
        String preferredFamily = resolveChineseFontFamily();

        if (StringUtils.hasText(customFontPath)) {
            candidates.add(Paths.get(customFontPath));
        }
        candidates.addAll(buildKnownFontCandidates());
        candidates.addAll(scanSystemFontFiles(preferredFamily));

        Path fallback = findFontViaFcMatch();
        if (fallback != null) {
            candidates.add(fallback);
        }

        for (Path candidate : candidates) {
            PDFont font = tryLoadFont(document, candidate);
            if (font != null) {
                return font;
            }
        }

        log.warn("no usable Chinese font file found, fallback to Helvetica");
        return PDType1Font.HELVETICA;
    }

    private static List<Path> buildKnownFontCandidates() {
        List<Path> candidates = new ArrayList<>();
        String osName = System.getProperty("os.name", "").toLowerCase();
        if (osName.contains("win")) {
            candidates.addAll(Arrays.asList(
                    Paths.get("C:/Windows/Fonts/simhei.ttf"),
                    Paths.get("C:/Windows/Fonts/simsunb.ttf"),
                    Paths.get("C:/Windows/Fonts/simkai.ttf"),
                    Paths.get("C:/Windows/Fonts/STXIHEI.TTF"),
                    Paths.get("C:/Windows/Fonts/STKAITI.TTF"),
                    Paths.get("C:/Windows/Fonts/Deng.ttf"),
                    Paths.get("C:/Windows/Fonts/msyh.ttf"),
                    Paths.get("C:/Windows/Fonts/HYZhongHeiTi-197.ttf"),
                    Paths.get("C:/Windows/Fonts/Alibaba-PuHuiTi-Regular.otf"),
                    Paths.get("C:/Windows/Fonts/NotoSansSC-VF.ttf")
            ));
        } else if (osName.contains("linux")) {
            candidates.addAll(Arrays.asList(
                    Paths.get("/usr/share/fonts/chinese/simsun.ttf"),
                    Paths.get("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.otf"),
                    Paths.get("/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf"),
                    Paths.get("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc")
            ));
        } else if (osName.contains("mac")) {
            candidates.addAll(Arrays.asList(
                    Paths.get("/System/Library/Fonts/PingFang.ttc"),
                    Paths.get("/System/Library/Fonts/Hiragino Sans GB.ttc")
            ));
        }
        return candidates;
    }

    private static List<Path> scanSystemFontFiles(String preferredFamily) {
        LinkedHashSet<Path> preferred = new LinkedHashSet<>();
        LinkedHashSet<Path> fallback = new LinkedHashSet<>();
        for (Path fontDir : getSystemFontDirectories()) {
            if (fontDir == null || !Files.isDirectory(fontDir)) {
                continue;
            }
            try (Stream<Path> stream = Files.walk(fontDir, 2)) {
                stream.filter(Files::isRegularFile)
                        .filter(ArchiveReportPdfUtil::isFontFile)
                        .forEach(path -> classifyFontFile(path, preferredFamily, preferred, fallback));
            } catch (Exception ex) {
                log.warn("scan system font dir failed: {}", fontDir, ex);
            }
        }
        List<Path> result = new ArrayList<>(preferred);
        result.addAll(fallback);
        return result;
    }

    private static void classifyFontFile(Path path,
                                         String preferredFamily,
                                         LinkedHashSet<Path> preferred,
                                         LinkedHashSet<Path> fallback) {
        Font font = loadAwtFont(path);
        if (font == null || font.canDisplayUpTo(CHINESE_SAMPLE) != -1) {
            return;
        }
        String family = font.getFamily();
        if (familyMatches(family, preferredFamily)) {
            preferred.add(path);
        } else {
            fallback.add(path);
        }
    }

    private static Font loadAwtFont(Path path) {
        if (path == null || !Files.isRegularFile(path)) {
            return null;
        }
        try (InputStream inputStream = Files.newInputStream(path)) {
            int fontType = isType1Font(path) ? Font.TYPE1_FONT : Font.TRUETYPE_FONT;
            return Font.createFont(fontType, inputStream);
        } catch (FontFormatException ex) {
            return null;
        } catch (IOException ex) {
            return null;
        }
    }

    private static boolean isType1Font(Path path) {
        String name = path.getFileName() == null ? "" : path.getFileName().toString().toLowerCase();
        return name.endsWith(".pfb") || name.endsWith(".pfm");
    }

    private static boolean isFontFile(Path path) {
        String name = path.getFileName() == null ? "" : path.getFileName().toString().toLowerCase();
        return name.endsWith(".ttf") || name.endsWith(".ttc") || name.endsWith(".otf") || isType1Font(path);
    }

    private static List<Path> getSystemFontDirectories() {
        String osName = System.getProperty("os.name", "").toLowerCase();
        List<Path> dirs = new ArrayList<>();
        if (osName.contains("win")) {
            dirs.add(Paths.get("C:/Windows/Fonts"));
        } else if (osName.contains("linux")) {
            dirs.add(Paths.get("/usr/share/fonts"));
            dirs.add(Paths.get("/usr/local/share/fonts"));
            String home = System.getProperty("user.home");
            if (StringUtils.hasText(home)) {
                dirs.add(Paths.get(home, ".fonts"));
            }
        } else if (osName.contains("mac")) {
            dirs.add(Paths.get("/System/Library/Fonts"));
            dirs.add(Paths.get("/Library/Fonts"));
            String home = System.getProperty("user.home");
            if (StringUtils.hasText(home)) {
                dirs.add(Paths.get(home, "Library", "Fonts"));
            }
        }
        return dirs;
    }

    private static PDFont tryLoadFont(PDDocument document, Path candidate) {
        if (candidate == null || !Files.isRegularFile(candidate)) {
            return null;
        }
        try {
            log.info("try briefing font: {}", candidate);
            return PDType0Font.load(document, candidate.toFile());
        } catch (Exception ex) {
            log.warn("load briefing font failed, skip {}: {}", candidate, ex.getMessage());
            return null;
        }
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }
    private static String resolveChineseFontFamily() {
        try {
            String customPath = firstNonBlank(System.getProperty("cjk.font.path"), System.getenv("CJK_FONT_PATH"));
            if (customPath != null) {
                String loadedFamily = registerCustomFont(customPath, CHINESE_SAMPLE);
                if (loadedFamily != null) {
                    return loadedFamily;
                }
            }

            String[] names = GraphicsEnvironment.getLocalGraphicsEnvironment().getAvailableFontFamilyNames();
            Set<String> available = new HashSet<>(Arrays.asList(names));
            for (String item : PREFERRED_FONT_FAMILIES) {
                String matched = findMatchedFamily(item, available);
                if (matched != null && new Font(matched, Font.PLAIN, 16).canDisplayUpTo(CHINESE_SAMPLE) == -1) {
                    return matched;
                }
            }
            for (String family : names) {
                if (new Font(family, Font.PLAIN, 16).canDisplayUpTo(CHINESE_SAMPLE) == -1) {
                    return family;
                }
            }
        } catch (Exception ex) {
            log.warn("resolve chinese font family failed: {}", ex.getMessage());
            return "Dialog";
        }
        return "Dialog";
    }

    private static String registerCustomFont(String path, String sample) {
        File fontFile = new File(path);
        if (!fontFile.exists() || !fontFile.isFile()) {
            log.warn("custom font file does not exist: {}", path);
            return null;
        }
        try (FileInputStream inputStream = new FileInputStream(fontFile)) {
            Font font = Font.createFont(Font.TRUETYPE_FONT, inputStream);
            GraphicsEnvironment.getLocalGraphicsEnvironment().registerFont(font);
            String family = font.getFamily();
            if (new Font(family, Font.PLAIN, 16).canDisplayUpTo(sample) == -1) {
                log.info("registered custom font family: {}", family);
                return family;
            }
        } catch (Exception ex) {
            log.warn("register custom font failed: {}", ex.getMessage());
        }
        return null;
    }

    private static String findMatchedFamily(String preferred, Set<String> available) {
        if (available.contains(preferred)) {
            return preferred;
        }
        String preferredLower = preferred.toLowerCase();
        String[] tokens = preferredLower.split("\\s+");
        for (String family : available) {
            if (family == null) {
                continue;
            }
            String familyLower = family.toLowerCase();
            if (familyLower.contains(preferredLower)) {
                return family;
            }
            boolean allHit = true;
            for (String token : tokens) {
                if (!token.isEmpty() && !familyLower.contains(token)) {
                    allHit = false;
                    break;
                }
            }
            if (allHit) {
                return family;
            }
        }
        return null;
    }

    private static boolean familyMatches(String family, String preferredFamily) {
        if (!StringUtils.hasText(family) || !StringUtils.hasText(preferredFamily)) {
            return false;
        }
        if (family.equalsIgnoreCase(preferredFamily)) {
            return true;
        }
        return findMatchedFamily(preferredFamily, new HashSet<>(Arrays.asList(family))) != null;
    }

    private static Path findFontViaFcMatch() {
        try {
            Process process = Runtime.getRuntime().exec("fc-match -f '%{file}' :lang=zh");
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line != null && !line.isEmpty()) {
                    return Paths.get(line);
                }
            }
        } catch (IOException ex) {
            log.warn("run fc-match failed", ex);
        }
        return null;
    }


//    private static PDFont loadFont(PDDocument document) throws IOException {
//        List<Path> candidates = Arrays.asList(
//                Paths.get("C:/Windows/Fonts/msyh.ttf"),
//                Paths.get("C:/Windows/Fonts/simhei.ttf"),
//                Paths.get("C:/Windows/Fonts/Deng.ttf"),
//                Paths.get("C:/Windows/Fonts/NotoSansSC-VF.ttf")
//        );
//        for (Path candidate : candidates) {
//            if (Files.exists(candidate)) {
//                return PDType0Font.load(document, candidate.toFile());
//            }
//        }
//        log.warn("archive report pdf font not found, fallback to Helvetica");
//        return PDType1Font.HELVETICA;
//    }

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

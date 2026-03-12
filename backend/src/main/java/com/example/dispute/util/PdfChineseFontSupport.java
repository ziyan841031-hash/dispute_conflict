package com.example.dispute.util;

import org.apache.fontbox.ttf.NamingTable;
import org.apache.fontbox.ttf.TrueTypeCollection;
import org.apache.fontbox.ttf.TrueTypeFont;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;

import java.awt.Font;
import java.awt.FontFormatException;
import java.awt.GraphicsEnvironment;
import java.io.BufferedReader;
import java.io.Closeable;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

public final class PdfChineseFontSupport {

    private static final Logger log = LoggerFactory.getLogger(PdfChineseFontSupport.class);
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

    private PdfChineseFontSupport() {
    }

    public static LoadedFont loadFont(PDDocument document) throws IOException {
        LinkedHashSet<Path> candidates = new LinkedHashSet<>();
        String customFontPath = firstNonBlank(System.getProperty("cjk.font.path"), System.getenv("CJK_FONT_PATH"));
        String preferredFamily = resolveChineseFontFamily();

        addCandidate(candidates, customFontPath);
        candidates.addAll(buildKnownFontCandidates());
        candidates.addAll(scanSystemFontFiles(preferredFamily));

        Path fallback = findFontViaFcMatch();
        if (fallback != null) {
            candidates.add(fallback.toAbsolutePath().normalize());
        }

        for (Path candidate : candidates) {
            LoadedFont loadedFont = tryLoadFont(document, candidate, preferredFamily);
            if (loadedFont != null) {
                return loadedFont;
            }
        }

        throw new IOException("No usable Chinese font file found. Configure -Dcjk.font.path or CJK_FONT_PATH.");
    }

    private static void addCandidate(Set<Path> candidates, String rawPath) {
        if (!StringUtils.hasText(rawPath)) {
            return;
        }
        try {
            candidates.add(Paths.get(rawPath.trim()).toAbsolutePath().normalize());
        } catch (Exception ex) {
            log.warn("ignore invalid font path {}: {}", rawPath, ex.getMessage());
        }
    }

    private static List<Path> buildKnownFontCandidates() {
        List<Path> candidates = new ArrayList<>();
        String osName = System.getProperty("os.name", "").toLowerCase();
        if (osName.contains("win")) {
            candidates.addAll(Arrays.asList(
                    Paths.get("C:/Windows/Fonts/simhei.ttf"),
                    Paths.get("C:/Windows/Fonts/simsun.ttc"),
                    Paths.get("C:/Windows/Fonts/simsunb.ttf"),
                    Paths.get("C:/Windows/Fonts/simkai.ttf"),
                    Paths.get("C:/Windows/Fonts/STXIHEI.TTF"),
                    Paths.get("C:/Windows/Fonts/STKAITI.TTF"),
                    Paths.get("C:/Windows/Fonts/Deng.ttf"),
                    Paths.get("C:/Windows/Fonts/msyh.ttc"),
                    Paths.get("C:/Windows/Fonts/msyh.ttf"),
                    Paths.get("C:/Windows/Fonts/HYZhongHeiTi-197.ttf"),
                    Paths.get("C:/Windows/Fonts/Alibaba-PuHuiTi-Regular.otf"),
                    Paths.get("C:/Windows/Fonts/NotoSansSC-VF.ttf")
            ));
        } else if (osName.contains("linux")) {
            candidates.addAll(Arrays.asList(
                    Paths.get("/usr/share/fonts/chinese/simsun.ttf"),
                    Paths.get("/usr/share/fonts/chinese/simsun.ttc"),
                    Paths.get("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
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
        List<Path> normalized = new ArrayList<>();
        for (Path candidate : candidates) {
            normalized.add(candidate.toAbsolutePath().normalize());
        }
        return normalized;
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
                        .filter(PdfChineseFontSupport::isFontFile)
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
        if (font == null) {
            if (looksLikeChineseFont(path)) {
                fallback.add(path.toAbsolutePath().normalize());
            }
            return;
        }
        if (font.canDisplayUpTo(CHINESE_SAMPLE) != -1) {
            return;
        }
        Path normalized = path.toAbsolutePath().normalize();
        if (familyMatches(font.getFamily(), preferredFamily)) {
            preferred.add(normalized);
        } else {
            fallback.add(normalized);
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

    private static boolean looksLikeChineseFont(Path path) {
        String name = path == null || path.getFileName() == null ? "" : path.getFileName().toString().toLowerCase();
        return name.contains("simsun")
                || name.contains("simhei")
                || name.contains("simkai")
                || name.contains("yahei")
                || name.contains("msyh")
                || name.contains("noto")
                || name.contains("cjk")
                || name.contains("wenquanyi")
                || name.contains("wqy")
                || name.contains("sourcehan")
                || name.contains("heiti")
                || name.contains("kaiti")
                || name.contains("fang")
                || name.contains("song")
                || name.contains("droidsansfallback")
                || name.contains("unicode")
                || name.contains("puhuiti");
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
                dirs.add(Paths.get(home, ".local", "share", "fonts"));
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

    private static LoadedFont tryLoadFont(PDDocument document, Path candidate, String preferredFamily) {
        if (candidate == null || !Files.isRegularFile(candidate)) {
            return null;
        }
        Path normalized = candidate.toAbsolutePath().normalize();
        Exception directFailure = null;
        try {
            PDFont font = PDType0Font.load(document, normalized.toFile());
            log.info("loaded pdf font file: {}", normalized);
            return new LoadedFont(font, null);
        } catch (Exception ex) {
            directFailure = ex;
        }

        TrueTypeCollection collection = null;
        try {
            collection = new TrueTypeCollection(normalized.toFile());
            TrueTypeFont trueTypeFont = selectTrueTypeFont(collection, preferredFamily);
            if (trueTypeFont == null) {
                closeQuietly(collection);
                return null;
            }
            PDFont font = PDType0Font.load(document, trueTypeFont, true);
            log.info("loaded pdf font from collection: {} -> {}", normalized, describeTrueTypeFont(trueTypeFont));
            return new LoadedFont(font, collection);
        } catch (Exception ex) {
            closeQuietly(collection);
            log.warn("load pdf font failed, skip {}: direct={}, collection={}",
                    normalized,
                    directFailure == null ? "-" : safeMessage(directFailure),
                    safeMessage(ex));
            return null;
        }
    }

    private static TrueTypeFont selectTrueTypeFont(TrueTypeCollection collection, String preferredFamily) throws IOException {
        if (collection == null) {
            return null;
        }
        if (StringUtils.hasText(preferredFamily)) {
            try {
                TrueTypeFont exact = collection.getFontByName(preferredFamily);
                if (exact != null) {
                    return exact;
                }
            } catch (IOException ex) {
                log.info("match TTC font by family failed: {}", ex.getMessage());
            }
        }

        List<TrueTypeFont> fonts = new ArrayList<>();
        collection.processAllFonts(new TrueTypeCollection.TrueTypeFontProcessor() {
            @Override
            public void process(TrueTypeFont trueTypeFont) {
                fonts.add(trueTypeFont);
            }
        });
        if (fonts.isEmpty()) {
            return null;
        }
        for (TrueTypeFont font : fonts) {
            if (fontMatchesPreferred(font, preferredFamily)) {
                return font;
            }
        }
        for (String preferred : PREFERRED_FONT_FAMILIES) {
            for (TrueTypeFont font : fonts) {
                if (fontMatchesPreferred(font, preferred)) {
                    return font;
                }
            }
        }
        return fonts.get(0);
    }

    private static boolean fontMatchesPreferred(TrueTypeFont font, String preferredFamily) {
        if (font == null || !StringUtils.hasText(preferredFamily)) {
            return false;
        }
        return findMatchedFamily(preferredFamily, collectFontNames(font)) != null;
    }

    private static Set<String> collectFontNames(TrueTypeFont font) {
        LinkedHashSet<String> names = new LinkedHashSet<>();
        if (font == null) {
            return names;
        }
        try {
            addName(names, font.getName());
        } catch (IOException ex) {
            log.info("read TTC font name failed: {}", ex.getMessage());
        }
        try {
            NamingTable naming = font.getNaming();
            if (naming != null) {
                addName(names, naming.getFontFamily());
                addName(names, naming.getPostScriptName());
            }
        } catch (IOException ex) {
            log.info("read TTC naming table failed: {}", ex.getMessage());
        }
        return names;
    }

    private static void addName(Set<String> names, String value) {
        if (StringUtils.hasText(value)) {
            names.add(value.trim());
        }
    }

    private static String describeTrueTypeFont(TrueTypeFont font) {
        Set<String> names = collectFontNames(font);
        if (names.isEmpty()) {
            return "unknown";
        }
        return String.join(" / ", names);
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
            log.warn("no AWT Chinese font family available, candidate files will be used directly");
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
                log.info("registered custom Chinese font family: {}", family);
                return family;
            }
            log.warn("custom font cannot display Chinese sample: {}", family);
        } catch (FontFormatException ex) {
            log.warn("custom font format is unsupported by AWT, will try PDFBox fallback: {}", ex.getMessage());
        } catch (Exception ex) {
            log.warn("register custom font failed: {}", ex.getMessage());
        }
        return null;
    }

    private static String findMatchedFamily(String preferred, Set<String> available) {
        if (!StringUtils.hasText(preferred) || available == null || available.isEmpty()) {
            return null;
        }
        if (available.contains(preferred)) {
            return preferred;
        }
        String preferredLower = preferred.toLowerCase();
        String[] tokens = preferredLower.split("\\s+");
        for (String family : available) {
            if (!StringUtils.hasText(family)) {
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
        Set<String> available = new HashSet<>();
        available.add(family);
        return findMatchedFamily(preferredFamily, available) != null;
    }

    private static Path findFontViaFcMatch() {
        Process process = null;
        try {
            process = new ProcessBuilder("fc-match", "-f", "%{file}", ":lang=zh").start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (StringUtils.hasText(line)) {
                    return Paths.get(line.trim()).toAbsolutePath().normalize();
                }
            }
        } catch (Exception ex) {
            log.info("run fc-match failed: {}", ex.getMessage());
        } finally {
            if (process != null) {
                process.destroy();
            }
        }
        return null;
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

    private static String safeMessage(Exception ex) {
        String message = ex == null ? null : ex.getMessage();
        return StringUtils.hasText(message) ? message : ex.getClass().getSimpleName();
    }

    private static void closeQuietly(Closeable closeable) {
        if (closeable == null) {
            return;
        }
        try {
            closeable.close();
        } catch (IOException ex) {
            log.info("close font resource failed: {}", ex.getMessage());
        }
    }

    public static final class LoadedFont implements Closeable {

        private final PDFont font;
        private final Closeable resource;

        private LoadedFont(PDFont font, Closeable resource) {
            this.font = font;
            this.resource = resource;
        }

        public PDFont getFont() {
            return font;
        }

        @Override
        public void close() throws IOException {
            if (resource != null) {
                resource.close();
            }
        }
    }
}
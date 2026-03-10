package com.example.dispute.util;

import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 调解协议书生成工具。
 */
public final class MediationDocUtil {

    private static final String FONT_FAMILY = "宋体";
    private static final int FONT_SIZE_NORMAL = 12;
    private static final int FONT_SIZE_TITLE = 16;
    private static final Path DEFAULT_BASE_DIR = Paths.get("generated-docs", "mediation-agreements");

    private MediationDocUtil() {
    }

    /**
     * 生成调解协议书并返回文件相对路径。
     */
    public static String generateMediationAgreementDocPath(String caseNo,
                                                           PartyInfo partyA,
                                                           PartyInfo partyB,
                                                           String disputeFactDetail,
                                                           String responsibilityDetail) throws IOException {
        Files.createDirectories(DEFAULT_BASE_DIR);
        String safeCaseNo = sanitizeFileName(defaultText(caseNo, "case"));
        String fileName = safeCaseNo + "_mediation_agreement_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + "_" + UUID.randomUUID().toString().substring(0, 8) + ".docx";
        Path output = DEFAULT_BASE_DIR.resolve(fileName);

        try (XWPFDocument doc = new XWPFDocument(); OutputStream os = Files.newOutputStream(output)) {
            addMediationAgreementContent(doc, partyA, partyB, disputeFactDetail, responsibilityDetail);
            doc.write(os);
        }
        return output.toString().replace('\\', '/');
    }

    public static void addMediationAgreementContent(XWPFDocument doc,
                                                    PartyInfo partyA,
                                                    PartyInfo partyB,
                                                    String disputeFactDetail,
                                                    String responsibilityDetail) {
        addTitle(doc, "调解协议书");
        addBlankLine(doc);

        addLabeledFillLine(doc, "甲方（姓名）：", partyA == null ? null : partyA.getName(), 18);
        addLabeledFillLine(doc, "性别：", partyA == null ? null : partyA.getGender(), 8);
        addLabeledFillLine(doc, "身份证号：", partyA == null ? null : partyA.getIdNo(), 28);
        addLabeledFillLine(doc, "联系方式：", partyA == null ? null : partyA.getPhone(), 22);
        addLabeledFillLine(doc, "地址：", partyA == null ? null : partyA.getAddress(), 30);

        addBlankLine(doc);

        addLabeledFillLine(doc, "乙方（姓名）：", partyB == null ? null : partyB.getName(), 18);
        addLabeledFillLine(doc, "性别：", partyB == null ? null : partyB.getGender(), 8);
        addLabeledFillLine(doc, "身份证号：", partyB == null ? null : partyB.getIdNo(), 28);
        addLabeledFillLine(doc, "联系方式：", partyB == null ? null : partyB.getPhone(), 22);
        addLabeledFillLineWithSuffix(doc, "地址：", partyB == null ? null : partyB.getAddress(), 30, "（当事人可以为自然人、法人或其他组织）");

        addBlankLine(doc);

        addLine(doc, "鉴于甲乙双方因相关纠纷产生争议，经友好协商，现双方一致同意通过法院调解解决该纠纷，并达成如下协议：");

        addBoldLine(doc, "一、纠纷事实及责任认定：");
        addPrefixFillSentence(doc, "1. 双方确认，", disputeFactDetail, 40, "。");
        addPrefixFillSentence(doc, "2. 根据上述事实，双方认可", responsibilityDetail, 40, "。");

        addBoldLine(doc, "二、调解内容：");
        addLine(doc, "1. 乙方同意向甲方支付人民币______元整（大写：______元整），作为[明确支付款项的性质，如赔偿款、违约金等]。");
        addLine(doc, "2. 支付方式及时间：");
        addIndentedLine(doc, "支付方式：乙方应通过[具体支付方式，如银行转账、支票等]将上述款项支付至甲方指定的账户。");
        addIndentedLine(doc, "支付时间：乙方应于本协议生效之日起______日内完成支付。");
        addIndentedLine(doc, "甲方指定收款账户信息如下：");
        addIndentedLine(doc, "开户银行：____________________");
        addIndentedLine(doc, "账户名称：____________________");
        addIndentedLine(doc, "账号：____________________");

        addBoldLine(doc, "三、双方权利与义务：");
        addLine(doc, "1. 甲方权利与义务：");
        addIndentedLine(doc, "甲方有权按照本协议约定收取乙方支付的款项。");
        addIndentedLine(doc, "甲方应在收到款项后向乙方出具收款凭证，并保证不再就本纠纷向乙方主张任何其他权利。");
        addLine(doc, "2. 乙方权利与义务：");
        addIndentedLine(doc, "乙方有权要求甲方按照本协议约定履行相关义务。");
        addIndentedLine(doc, "乙方应按照本协议约定按时足额向甲方支付款项。若乙方逾期支付，每逾期一日，应按照未支付金额的______%向甲方支付违约金。");

        addBoldLine(doc, "四、保密条款");
        addLine(doc, "双方同意，对于在本纠纷调解过程中知悉的对方商业秘密、个人隐私等信息予以保密，未经对方书面同意，不得向任何第三方披露。");

        addBoldLine(doc, "五、协议的生效与履行");
        addLine(doc, "1. 本协议自双方签字（或盖章）之日起生效。");
        addLine(doc, "2. 双方应严格履行本协议约定的各项义务。若一方违反本协议，应承担因此给对方造成的全部损失。");

        addBoldLine(doc, "六、争议解决");
        addLine(doc, "如双方在本协议履行过程中发生争议，应首先通过友好协商解决；协商不成的，任何一方均有权向有管辖权的人民法院提起诉讼。");

        addBoldLine(doc, "七、其他条款");
        addLine(doc, "1. 本协议一式______份，甲乙双方各执______份，交[调解机构名称]备案______份，具有同等法律效力。");
        addLine(doc, "2. 本协议未尽事宜，可由双方另行签订补充协议。补充协议与本协议具有同等法律效力。");

        addSignatureSection(doc);
    }

    public static void addLabeledFillLine(XWPFDocument doc, String label, String value, int blankLen) {
        XWPFParagraph p = createBaseParagraph(doc, ParagraphAlignment.LEFT, 0);
        createRun(p, false, false, safe(label));
        writeFillText(p, value, blankLen);
    }

    public static void addLabeledFillLineWithSuffix(XWPFDocument doc, String label, String value, int blankLen, String suffix) {
        XWPFParagraph p = createBaseParagraph(doc, ParagraphAlignment.LEFT, 0);
        createRun(p, false, false, safe(label));
        writeFillText(p, value, blankLen);
        createRun(p, false, false, safe(suffix));
    }

    public static void addPrefixFillSentence(XWPFDocument doc, String prefix, String value, int blankLen, String suffix) {
        XWPFParagraph p = createBaseParagraph(doc, ParagraphAlignment.LEFT, 0);
        createRun(p, false, false, safe(prefix));
        writeFillText(p, value, blankLen);
        createRun(p, false, false, safe(suffix));
    }

    public static void addSignatureSection(XWPFDocument doc) {
        addBlankLine(doc);
        addLine(doc, "甲方（签字/盖章）：__________________");
        addLine(doc, "日期：______年____月____日");

        addBlankLine(doc);
        addLine(doc, "乙方（签字/盖章）：__________________");
        addLine(doc, "日期：______年____月____日");

        addBlankLine(doc);
        addBlankLine(doc);

        addRightLine(doc, "[受理调解的机构名称]（盖章）");
        addRightLine(doc, "调解员：___");
    }

    public static void addTitle(XWPFDocument doc, String text) {
        XWPFParagraph p = createBaseParagraph(doc, ParagraphAlignment.CENTER, 0);
        XWPFRun r = createRun(p, true, false, safe(text));
        r.setFontSize(FONT_SIZE_TITLE);
    }

    public static void addLine(XWPFDocument doc, String text) {
        XWPFParagraph p = createBaseParagraph(doc, ParagraphAlignment.LEFT, 0);
        createRun(p, false, false, safe(text));
    }

    public static void addBoldLine(XWPFDocument doc, String text) {
        XWPFParagraph p = createBaseParagraph(doc, ParagraphAlignment.LEFT, 0);
        createRun(p, true, false, safe(text));
    }

    public static void addIndentedLine(XWPFDocument doc, String text) {
        XWPFParagraph p = createBaseParagraph(doc, ParagraphAlignment.LEFT, 500);
        createRun(p, false, false, safe(text));
    }

    public static void addRightLine(XWPFDocument doc, String text) {
        XWPFParagraph p = createBaseParagraph(doc, ParagraphAlignment.RIGHT, 0);
        createRun(p, false, false, safe(text));
    }

    public static void addBlankLine(XWPFDocument doc) {
        XWPFParagraph p = createBaseParagraph(doc, ParagraphAlignment.LEFT, 0);
        createRun(p, false, false, "");
    }

    private static XWPFParagraph createBaseParagraph(XWPFDocument doc, ParagraphAlignment alignment, int indentationLeft) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(alignment);
        p.setIndentationLeft(indentationLeft);
        p.setSpacingAfter(120);
        p.setSpacingBefore(0);
        return p;
    }

    private static XWPFRun createRun(XWPFParagraph p, boolean bold, boolean underline, String text) {
        XWPFRun run = p.createRun();
        run.setFontFamily(FONT_FAMILY);
        run.setFontSize(FONT_SIZE_NORMAL);
        run.setBold(bold);
        if (underline) {
            run.setUnderline(UnderlinePatterns.SINGLE);
        }
        run.setText(text);
        return run;
    }

    private static void writeFillText(XWPFParagraph p, String value, int blankLen) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            createRun(p, false, true, repeatFullWidthSpace(blankLen));
            return;
        }
        createRun(p, false, true, normalized);
        int remain = Math.max(0, blankLen - visualLen(normalized));
        if (remain > 0) {
            createRun(p, false, true, repeatFullWidthSpace(remain));
        }
    }

    private static String safe(String v) {
        return v == null ? "" : v;
    }

    private static String trimToNull(String v) {
        if (v == null) {
            return null;
        }
        String s = v.trim();
        return s.isEmpty() ? null : s;
    }

    private static String defaultText(String v, String fallback) {
        String trimmed = trimToNull(v);
        return trimmed == null ? fallback : trimmed;
    }

    private static String repeatFullWidthSpace(int n) {
        if (n <= 0) {
            return "";
        }
        StringBuilder sb = new StringBuilder(n);
        for (int i = 0; i < n; i++) {
            sb.append('\u3000');
        }
        return sb.toString();
    }

    private static int visualLen(String s) {
        return s == null ? 0 : s.length();
    }

    private static String sanitizeFileName(String value) {
        return value.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    public static class PartyInfo {
        private String name;
        private String gender;
        private String idNo;
        private String phone;
        private String address;

        public PartyInfo() {
        }

        public PartyInfo(String name, String gender, String idNo, String phone, String address) {
            this.name = name;
            this.gender = gender;
            this.idNo = idNo;
            this.phone = phone;
            this.address = address;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getGender() {
            return gender;
        }

        public void setGender(String gender) {
            this.gender = gender;
        }

        public String getIdNo() {
            return idNo;
        }

        public void setIdNo(String idNo) {
            this.idNo = idNo;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getAddress() {
            return address;
        }

        public void setAddress(String address) {
            this.address = address;
        }
    }
}

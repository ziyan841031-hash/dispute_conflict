package com.example.dispute.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.dispute.client.DifyClient;
import com.example.dispute.dto.CaseQueryRequest;
import com.example.dispute.dto.TextIngestRequest;
import com.example.dispute.entity.CaseClassifyRecord;
import com.example.dispute.entity.CaseRecord;
import com.example.dispute.mapper.CaseClassifyRecordMapper;
import com.example.dispute.mapper.CaseRecordMapper;
import com.example.dispute.service.CaseRecordService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.StringJoiner;
import java.util.UUID;

/**
 * 案件服务实现类。
 */
@Service // 声明为服务组件。
public class CaseRecordServiceImpl implements CaseRecordService {

    // 定义日志对象。
    private static final Logger log = LoggerFactory.getLogger(CaseRecordServiceImpl.class);
    // 定义Mapper对象。
    private final CaseRecordMapper caseRecordMapper;
    // 定义Dify客户端对象。
    private final DifyClient difyClient;
    // 定义分类结果Mapper对象。
    private final CaseClassifyRecordMapper caseClassifyRecordMapper;
    // 定义JSON对象映射器。
    private final ObjectMapper objectMapper = new ObjectMapper();
    /**
     * 构造函数。
     */
    public CaseRecordServiceImpl(CaseRecordMapper caseRecordMapper, DifyClient difyClient, CaseClassifyRecordMapper caseClassifyRecordMapper) {
        // 注入Mapper。
        this.caseRecordMapper = caseRecordMapper;
        // 注入Dify客户端。
        this.difyClient = difyClient;
        // 注入分类结果Mapper。
        this.caseClassifyRecordMapper = caseClassifyRecordMapper;
    }

    /**
     * 文本案件入库。
     */
    @Override // 重写接口方法。
    public CaseRecord ingestText(TextIngestRequest request) {
        // 打印服务日志。
        log.info("服务层-文本入库开始: eventSource={}", request.getEventSource());
        // 调用Dify要素提取智能体。
        Object extractResult = difyClient.runExtractWorkflow(request.getCaseText());
        // 打印要素提取响应日志。
        log.info("服务层-Dify要素提取完成: resultType={}", extractResult == null ? "null" : extractResult.getClass().getSimpleName());

        // 提取当事人名称。
        String parsedPartyName = pickOutputValue(extractResult, "party_name");
        // 提取对方当事人名称。
        String parsedCounterpartyName = pickOutputValue(extractResult, "counterparty_name");
        // 提取纠纷概要文本。
        String parsedSummary = pickOutputValue(extractResult, "dispute_summary");

        // 保存案件数据。
        CaseRecord record = saveCase(defaultVal(request.getEventSource(), "其他线下接待"),
                defaultVal(parsedSummary, request.getCaseText()), null, null,
                defaultVal(parsedPartyName, request.getPartyName()),
                defaultVal(parsedCounterpartyName, request.getCounterpartyName()),
                request.getDisputeType(), null, request.getRiskLevel(), request.getHandlingProgress(), request.getReceiver());
        // 打印服务日志。
        log.info("服务层-文本入库完成: caseNo={}", record.getCaseNo());
        // 返回结果对象。
        return record;
    }

    /**
     * Excel案件入库。
     */
    @Override // 重写接口方法。
    public CaseRecord ingestExcel(MultipartFile file) {
        // 打印服务日志。
        log.info("服务层-Excel入库开始: fileName={}", file.getOriginalFilename());
        // 解析Excel文本。
        String parsedText = parseExcelToText(file);
        // 保存案件数据。
        CaseRecord record = saveCase("EXCEL", parsedText, file.getOriginalFilename(), null,
                null, null, "未分类", null, "中", "待处理", "系统导入");
        // 打印服务日志。
        log.info("服务层-Excel入库完成: caseNo={}", record.getCaseNo());
        // 返回结果对象。
        return record;
    }

    /**
     * 音频案件入库。
     */
    @Override // 重写接口方法。
    public CaseRecord ingestAudio(MultipartFile file) {
        // 打印服务日志。
        log.info("服务层-音频入库开始: fileName={}", file.getOriginalFilename());
        // 构建占位转写文本。
        String parsedText = "[音频转写占位] 文件 " + file.getOriginalFilename() + " 已上传，待接入ASR模型后自动转写";
        // 保存案件数据。
        CaseRecord record = saveCase("AUDIO", parsedText, file.getOriginalFilename(), 0,
                null, null, "未分类", null, "中", "待处理", "系统导入");
        // 打印服务日志。
        log.info("服务层-音频入库完成: caseNo={}", record.getCaseNo());
        // 返回结果对象。
        return record;
    }

    /**
     * 分页查询案件。
     */
    @Override // 重写接口方法。
    public IPage<CaseRecord> queryCases(CaseQueryRequest request) {
        // 打印服务日志。
        log.info("服务层-案件查询开始");
        // 构造分页对象。
        Page<CaseRecord> page = new Page<>(request.getPageNo(), request.getPageSize());
        // 构造查询条件。
        LambdaQueryWrapper<CaseRecord> wrapper = new LambdaQueryWrapper<>();
        // 判断关键词是否存在。
        if (StringUtils.hasText(request.getKeyword())) {
            // 添加案件描述模糊查询。
            wrapper.like(CaseRecord::getCaseText, request.getKeyword());
        }
        // 判断纠纷类型是否存在。
        if (StringUtils.hasText(request.getDisputeType())) {
            // 添加纠纷类型等值查询。
            wrapper.eq(CaseRecord::getDisputeType, request.getDisputeType());
        }
        // 判断事件来源是否存在。
        if (StringUtils.hasText(request.getEventSource())) {
            // 添加事件来源等值查询。
            wrapper.eq(CaseRecord::getEventSource, request.getEventSource());
        }
        // 判断风险等级是否存在。
        if (StringUtils.hasText(request.getRiskLevel())) {
            // 添加风险等级等值查询。
            wrapper.eq(CaseRecord::getRiskLevel, request.getRiskLevel());
        }
        // 添加登记时间倒序。
        wrapper.orderByDesc(CaseRecord::getRegisterTime);
        // 执行分页查询。
        IPage<CaseRecord> result = caseRecordMapper.selectPage(page, wrapper);
        // 打印服务日志。
        log.info("服务层-案件查询完成: total={}", result.getTotal());
        // 返回分页结果。
        return result;
    }



    /**
     * 智能分类并回写案件。
     */
    @Override // 重写接口方法。
    public Object intelligentClassify(TextIngestRequest request) {
        // 校验案件ID。
        if (request.getCaseId() == null) {
            // 抛出参数异常。
            throw new IllegalArgumentException("caseId不能为空");
        }
        // 调用Dify智能分类工作流。
        Object classifyResult = difyClient.runClassifyWorkflow(request.getCaseText());
        // 提取纠纷类型。
        String disputeType = firstNonEmpty(
                pickOutputValue(classifyResult, "dispute_category_l1"),
                pickOutputValue(classifyResult, "dispute_type"),
                pickOutputValue(classifyResult, "纠纷类型")
        );
        // 提取纠纷子类型。
        String disputeSubType = firstNonEmpty(
                pickOutputValue(classifyResult, "dispute_category_l2"),
                pickOutputValue(classifyResult, "dispute_sub_type"),
                pickOutputValue(classifyResult, "纠纷子类型")
        );
        // 提取风险等级。
        String riskLevel = firstNonEmpty(
                pickOutputValue(classifyResult, "risk_level"),
                pickOutputValue(classifyResult, "风险等级")
        );
        // 查询案件记录。
        CaseRecord record = caseRecordMapper.selectById(request.getCaseId());
        // 判断记录是否存在。
        if (record == null) {
            // 抛出参数异常。
            throw new IllegalArgumentException("未找到案件记录: " + request.getCaseId());
        }
        // 回写纠纷类型。
        record.setDisputeType(defaultVal(disputeType, record.getDisputeType()));
        // 回写纠纷子类型。
        record.setDisputeSubType(defaultVal(disputeSubType, record.getDisputeSubType()));
        // 回写风险等级。
        record.setRiskLevel(defaultVal(riskLevel, record.getRiskLevel()));
        // 更新修改时间。
        record.setUpdatedAt(LocalDateTime.now());
        // 执行更新。
        caseRecordMapper.updateById(record);

        // 组装返回对象。
        Map<String, Object> result = new java.util.HashMap<>();
        // 写入案件ID。
        result.put("caseId", record.getId());
        // 写入纠纷类型。
        result.put("disputeType", record.getDisputeType());
        // 写入纠纷子类型。
        result.put("disputeSubType", record.getDisputeSubType());
        // 写入风险等级。
        result.put("riskLevel", record.getRiskLevel());
        // 写入原始分类结果。
        result.put("classifyResult", classifyResult);

        // 保存案件分类子表记录。
        saveCaseClassifyRecord(record.getId(), classifyResult);
        // 返回结果。
        return result;
    }

    /**
     * 保存案件分类子表记录。
     */
    private void saveCaseClassifyRecord(Long caseId, Object classifyResult) {
        // 创建子表实体对象。
        CaseClassifyRecord classifyRecord = new CaseClassifyRecord();
        // 设置案件ID。
        classifyRecord.setCaseId(caseId);
        // 设置工作流运行ID。
        classifyRecord.setWorkflowRunId(firstNonEmpty(
                pickRootValue(classifyResult, "workflow_run_id"),
                pickNestedValue(classifyResult, "data", "workflow_run_id")
        ));
        // 按智能分类报文字段逐项入库。
        classifyRecord.setDisputeCategoryL1(pickOutputValue(classifyResult, "dispute_category_l1"));
        classifyRecord.setDisputeCategoryL2(pickOutputValue(classifyResult, "dispute_category_l2"));
        classifyRecord.setModelSuggestedCategoryL1(pickOutputValue(classifyResult, "model_suggested_category_l1"));
        classifyRecord.setModelSuggestedCategoryL2(pickOutputValue(classifyResult, "model_suggested_category_l2"));
        classifyRecord.setRiskLevel(pickOutputValue(classifyResult, "risk_level"));
        classifyRecord.setFactsSummary(pickOutputValue(classifyResult, "facts_summary"));
        classifyRecord.setJudgementBasis(pickOutputJsonValue(classifyResult, "judgement_basis"));
        classifyRecord.setEmotionAssessment(pickOutputJsonValue(classifyResult, "emotion_assessment"));
        classifyRecord.setIsInClientTaxonomy(toInteger(pickOutputValue(classifyResult, "is_in_client_taxonomy")));
        classifyRecord.setParseError(pickOutputValue(classifyResult, "parse_error"));
        // 设置创建时间。
        classifyRecord.setCreatedAt(LocalDateTime.now());
        // 执行插入。
        caseClassifyRecordMapper.insert(classifyRecord);
    }

    /**
     * 从顶层结果中提取指定字段。
     */
    private String pickRootValue(Object result, String key) {
        // 判断结果是否为Map。
        if (!(result instanceof Map)) {
            // 返回空值。
            return null;
        }
        // 强转Map对象。
        Map<?, ?> root = (Map<?, ?>) result;
        // 获取字段值。
        Object value = root.get(key);
        // 返回字符串值。
        return value == null ? null : String.valueOf(value);
    }

    /**
     * 从嵌套结果中提取指定字段。
     */
    private String pickNestedValue(Object result, String parentKey, String key) {
        // 判断结果是否为Map。
        if (!(result instanceof Map)) {
            // 返回空值。
            return null;
        }
        // 强转根Map对象。
        Map<?, ?> root = (Map<?, ?>) result;
        // 获取父节点值。
        Object parent = root.get(parentKey);
        // 判断父节点是否为Map。
        if (!(parent instanceof Map)) {
            // 返回空值。
            return null;
        }
        // 强转父Map对象。
        Map<?, ?> nested = (Map<?, ?>) parent;
        // 获取子节点值。
        Object value = nested.get(key);
        // 返回字符串值。
        return value == null ? null : String.valueOf(value);
    }

    /**
     * 统一保存案件数据。
     */
    private CaseRecord saveCase(String eventSource, String parsedText, String fileName, Integer audioDurationSec,
                                String partyName, String counterpartyName, String disputeType, String disputeSubType,
                                String riskLevel, String handlingProgress, String receiver) {
        // 获取当前时间。
        LocalDateTime now = LocalDateTime.now();
        // 创建实体对象。
        CaseRecord record = new CaseRecord();
        // 设置案件编号。
        record.setCaseNo("CASE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        // 设置当事人。
        record.setPartyName(defaultVal(partyName, "未知当事人"));
        // 设置对方当事人。
        record.setCounterpartyName(defaultVal(counterpartyName, "未知对方当事人"));
        // 设置纠纷类型。
        record.setDisputeType(defaultVal(disputeType, ""));
        // 设置纠纷子类型（可为空）。
        record.setDisputeSubType(defaultVal(disputeSubType, null));
        // 设置事件来源。
        record.setEventSource(eventSource);
        // 设置风险等级。
        record.setRiskLevel(defaultVal(riskLevel, ""));
        // 设置办理进度。
        record.setHandlingProgress(defaultVal(handlingProgress, "待处理"));
        // 设置接待人。
        record.setReceiver(defaultVal(receiver, "张三"));
        // 设置登记时间。
        record.setRegisterTime(now);
        // 设置案件内容。
        record.setCaseText(parsedText);
        // 设置源文件名。
        record.setSourceFileName(fileName);
        // 设置音频时长。
        record.setAudioDurationSec(audioDurationSec);
        // 设置创建时间。
        record.setCreatedAt(now);
        // 设置更新时间。
        record.setUpdatedAt(now);
        // 执行插入。
        caseRecordMapper.insert(record);
        // 返回实体对象。
        return record;
    }

    /**
     * 从Dify结果中提取outputs指定字段。
     */
    private String pickOutputValue(Object extractResult, String key) {
        // 判断结果是否为Map。
        if (!(extractResult instanceof Map)) {
            // 返回空值。
            return null;
        }
        // 强转顶层Map。
        Map<?, ?> rootMap = (Map<?, ?>) extractResult;
        // 提取outputs对象。
        Object outputsObj = rootMap.get("outputs");
        // 判断outputs是否为Map。
        if (!(outputsObj instanceof Map)) {
            // 返回空值。
            return null;
        }
        // 强转outputs对象。
        Map<?, ?> outputsMap = (Map<?, ?>) outputsObj;
        // 获取目标字段值。
        Object value = outputsMap.get(key);
        // 返回字符串值。
        return value == null ? null : String.valueOf(value);
    }


    /**
     * 从Dify结果中提取outputs指定字段并转为JSON字符串。
     */
    private String pickOutputJsonValue(Object extractResult, String key) {
        // 判断结果是否为Map。
        if (!(extractResult instanceof Map)) {
            // 返回空值。
            return null;
        }
        // 强转顶层Map。
        Map<?, ?> rootMap = (Map<?, ?>) extractResult;
        // 提取outputs对象。
        Object outputsObj = rootMap.get("outputs");
        // 判断outputs是否为Map。
        if (!(outputsObj instanceof Map)) {
            // 返回空值。
            return null;
        }
        // 强转outputs对象。
        Map<?, ?> outputsMap = (Map<?, ?>) outputsObj;
        // 获取目标字段值。
        Object value = outputsMap.get(key);
        // 判断字段值是否为空。
        if (value == null) {
            // 返回空值。
            return null;
        }
        // 序列化字段值。
        return toJson(value);
    }

    /**
     * 将对象转换为JSON字符串。
     */
    private String toJson(Object value) {
        try {
            // 返回JSON字符串。
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            // 返回兜底字符串。
            return String.valueOf(value);
        }
    }

    /**
     * 将字符串转换为整数。
     */
    private Integer toInteger(String value) {
        // 判断输入是否为空。
        if (!StringUtils.hasText(value)) {
            // 返回空值。
            return null;
        }
        try {
            // 返回整数值。
            return Integer.valueOf(value);
        } catch (NumberFormatException ex) {
            // 返回空值。
            return null;
        }
    }



    /**
     * 返回第一个非空字符串。
     */
    private String firstNonEmpty(String... values) {
        // 遍历字符串数组。
        for (String value : values) {
            // 判断是否有文本。
            if (StringUtils.hasText(value)) {
                // 返回命中的值。
                return value;
            }
        }
        // 无可用值返回空。
        return null;
    }

    /**
     * 处理默认值。
     */
    private String defaultVal(String value, String defaultValue) {
        // 返回非空值或默认值。
        return StringUtils.hasText(value) ? value : defaultValue;
    }

    /**
     * 解析Excel为文本。
     */
    private String parseExcelToText(MultipartFile file) {
        // 使用try-with-resource打开工作簿。
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            // 获取第一个sheet。
            Sheet sheet = workbook.getSheetAt(0);
            // 创建文本拼接器。
            StringJoiner text = new StringJoiner("\n");
            // 遍历每一行。
            for (Row row : sheet) {
                // 创建行拼接器。
                StringJoiner rowText = new StringJoiner(" | ");
                // 遍历每一列。
                for (Cell cell : row) {
                    // 添加单元格内容。
                    rowText.add(cell.toString());
                }
                // 添加行内容。
                text.add(rowText.toString());
            }
            // 返回解析文本。
            return text.toString();
        } catch (IOException ex) {
            // 打印异常日志。
            log.error("Excel解析失败", ex);
            // 抛出业务异常。
            throw new IllegalArgumentException("Excel解析失败: " + ex.getMessage(), ex);
        }
    }
}

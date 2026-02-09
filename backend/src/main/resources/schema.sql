CREATE TABLE IF NOT EXISTS case_record (
    id BIGSERIAL PRIMARY KEY,
    case_no VARCHAR(64) NOT NULL UNIQUE,
    party_name VARCHAR(100) NOT NULL,
    counterparty_name VARCHAR(100) NOT NULL,
    dispute_type VARCHAR(50) NOT NULL,
    dispute_sub_type VARCHAR(50),
    event_source VARCHAR(20) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    handling_progress VARCHAR(50) NOT NULL,
    receiver VARCHAR(100) NOT NULL,
    register_time TIMESTAMP NOT NULL,
    case_text TEXT NOT NULL,
    source_file_name VARCHAR(255),
    audio_duration_sec INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

COMMENT ON TABLE case_record IS '案件主表';
COMMENT ON COLUMN case_record.id IS '主键ID';
COMMENT ON COLUMN case_record.case_no IS '案件编号';
COMMENT ON COLUMN case_record.party_name IS '当事人';
COMMENT ON COLUMN case_record.counterparty_name IS '对方当事人';
COMMENT ON COLUMN case_record.dispute_type IS '纠纷类型';
COMMENT ON COLUMN case_record.dispute_sub_type IS '纠纷子类型';
COMMENT ON COLUMN case_record.event_source IS '事件来源';
COMMENT ON COLUMN case_record.risk_level IS '风险等级';
COMMENT ON COLUMN case_record.handling_progress IS '办理进度';
COMMENT ON COLUMN case_record.receiver IS '接待人';
COMMENT ON COLUMN case_record.register_time IS '登记时间';
COMMENT ON COLUMN case_record.case_text IS '案件描述文本';
COMMENT ON COLUMN case_record.source_file_name IS '源文件名';
COMMENT ON COLUMN case_record.audio_duration_sec IS '音频时长(秒)';
COMMENT ON COLUMN case_record.created_at IS '创建时间';
COMMENT ON COLUMN case_record.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_case_record_dispute_type ON case_record(dispute_type);
CREATE INDEX IF NOT EXISTS idx_case_record_dispute_sub_type ON case_record(dispute_sub_type);
CREATE INDEX IF NOT EXISTS idx_case_record_event_source ON case_record(event_source);
CREATE INDEX IF NOT EXISTS idx_case_record_register_time ON case_record(register_time DESC);


CREATE TABLE IF NOT EXISTS case_classify_record (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL,
    workflow_run_id VARCHAR(64),
    dispute_category_l1 VARCHAR(100),
    dispute_category_l2 VARCHAR(100),
    model_suggested_category_l1 VARCHAR(100),
    model_suggested_category_l2 VARCHAR(100),
    risk_level VARCHAR(20),
    facts_summary TEXT,
    judgement_basis TEXT,
    emotion_assessment TEXT,
    is_in_client_taxonomy INTEGER,
    parse_error TEXT,
    created_at TIMESTAMP NOT NULL
);

COMMENT ON TABLE case_classify_record IS '案件智能分类结果表';
COMMENT ON COLUMN case_classify_record.id IS '主键ID';
COMMENT ON COLUMN case_classify_record.case_id IS '案件ID';
COMMENT ON COLUMN case_classify_record.workflow_run_id IS '工作流运行ID';
COMMENT ON COLUMN case_classify_record.dispute_category_l1 IS '纠纷一级分类';
COMMENT ON COLUMN case_classify_record.dispute_category_l2 IS '纠纷二级分类';
COMMENT ON COLUMN case_classify_record.model_suggested_category_l1 IS '模型建议一级分类';
COMMENT ON COLUMN case_classify_record.model_suggested_category_l2 IS '模型建议二级分类';
COMMENT ON COLUMN case_classify_record.risk_level IS '风险等级';
COMMENT ON COLUMN case_classify_record.facts_summary IS '事实摘要';
COMMENT ON COLUMN case_classify_record.judgement_basis IS '判断依据(JSON字符串)';
COMMENT ON COLUMN case_classify_record.emotion_assessment IS '情绪评估(JSON字符串)';
COMMENT ON COLUMN case_classify_record.is_in_client_taxonomy IS '是否在客户分类体系内';
COMMENT ON COLUMN case_classify_record.parse_error IS '解析错误信息';
COMMENT ON COLUMN case_classify_record.created_at IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_case_classify_record_case_id ON case_classify_record(case_id);
CREATE INDEX IF NOT EXISTS idx_case_classify_record_workflow_run_id ON case_classify_record(workflow_run_id);

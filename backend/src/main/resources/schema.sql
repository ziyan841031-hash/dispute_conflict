CREATE TABLE IF NOT EXISTS case_record (
    id BIGSERIAL PRIMARY KEY,
    case_no VARCHAR(64) NOT NULL UNIQUE,
    party_name VARCHAR(100) NOT NULL,
    party_id VARCHAR(32),
    party_phone VARCHAR(32),
    party_address VARCHAR(255),
    counterparty_name VARCHAR(100) NOT NULL,
    counterparty_id VARCHAR(32),
    counterparty_phone VARCHAR(32),
    counterparty_address VARCHAR(255),
    dispute_type VARCHAR(50) NOT NULL,
    dispute_location VARCHAR(255),
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
COMMENT ON COLUMN case_record.party_id IS '当事人身份证号';
COMMENT ON COLUMN case_record.party_phone IS '当事人电话';
COMMENT ON COLUMN case_record.party_address IS '当事人地址';
COMMENT ON COLUMN case_record.counterparty_name IS '对方当事人';
COMMENT ON COLUMN case_record.counterparty_id IS '对方当事人身份证号';
COMMENT ON COLUMN case_record.counterparty_phone IS '对方当事人电话';
COMMENT ON COLUMN case_record.counterparty_address IS '对方当事人地址';
COMMENT ON COLUMN case_record.dispute_type IS '纠纷类型';
COMMENT ON COLUMN case_record.dispute_location IS '纠纷发生地';
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


ALTER TABLE case_record ADD COLUMN IF NOT EXISTS party_id VARCHAR(32);
ALTER TABLE case_record ADD COLUMN IF NOT EXISTS party_phone VARCHAR(32);
ALTER TABLE case_record ADD COLUMN IF NOT EXISTS party_address VARCHAR(255);
ALTER TABLE case_record ADD COLUMN IF NOT EXISTS counterparty_id VARCHAR(32);
ALTER TABLE case_record ADD COLUMN IF NOT EXISTS counterparty_phone VARCHAR(32);
ALTER TABLE case_record ADD COLUMN IF NOT EXISTS counterparty_address VARCHAR(255);
ALTER TABLE case_record ADD COLUMN IF NOT EXISTS dispute_location VARCHAR(255);



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

CREATE TABLE IF NOT EXISTS disposal_org_dict (
    id BIGSERIAL PRIMARY KEY,
    org_name VARCHAR(128) NOT NULL,
    org_phone VARCHAR(32) NOT NULL UNIQUE,
    org_address VARCHAR(255) NOT NULL,
    active_case_count INTEGER NOT NULL,
    success_rate NUMERIC(5,2) NOT NULL,
    duty_person VARCHAR(64) NOT NULL,
    leader_name VARCHAR(64) NOT NULL,
    duty_phone VARCHAR(32) NOT NULL,
    mediation_category VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE disposal_org_dict IS '处置机构码表';
COMMENT ON COLUMN disposal_org_dict.org_name IS '处置机构名称';
COMMENT ON COLUMN disposal_org_dict.org_phone IS '处置机构电话';
COMMENT ON COLUMN disposal_org_dict.org_address IS '处置机构地址';
COMMENT ON COLUMN disposal_org_dict.active_case_count IS '当前处置中案件';
COMMENT ON COLUMN disposal_org_dict.success_rate IS '处置成功率';
COMMENT ON COLUMN disposal_org_dict.duty_person IS '当前值班人员';
COMMENT ON COLUMN disposal_org_dict.leader_name IS '分管领导';
COMMENT ON COLUMN disposal_org_dict.duty_phone IS '值班人联系电话';
COMMENT ON COLUMN disposal_org_dict.mediation_category IS '调解归类';

CREATE INDEX IF NOT EXISTS idx_disposal_org_dict_category ON disposal_org_dict(mediation_category);

INSERT INTO disposal_org_dict (org_name, org_phone, org_address, active_case_count, success_rate, duty_person, leader_name, duty_phone, mediation_category) VALUES
('人民法院','68000000','上海市黄浦区xx路xx号',185,37.06,'张三','李四','15800000000','专业调解'),
('人民检察院','68000001','上海市黄浦区xx路xx号',170,37.64,'张三','李四','15800000000','专业调解'),
('公安部门','68000002','上海市黄浦区xx路xx号',107,49.28,'张三','李四','15800000000','行政调解'),
('民政部门','68000003','上海市黄浦区xx路xx号',62,40.20,'张三','李四','15800000000','行政调解'),
('司法行政部门','68000004','上海市黄浦区xx路xx号',185,46.51,'张三','李四','15800000000','行政调解'),
('人社部门','68000005','上海市黄浦区xx路xx号',185,30.20,'张三','李四','15800000000','行政调解'),
('住建部门','68000006','上海市黄浦区xx路xx号',164,59.28,'张三','李四','15800000000','行政调解'),
('卫健部门','68000007','上海市黄浦区xx路xx号',17,51.16,'张三','李四','15800000000','行政调解'),
('总工会','68000008','上海市黄浦区xx路xx号',107,38.46,'张三','李四','15800000000','人民调解'),
('妇联','68000009','上海市黄浦区xx路xx号',133,33.94,'张三','李四','15800000000','人民调解'),
('信访部门','68000010','上海市黄浦区xx路xx号',130,41.33,'张三','李四','15800000000','行政调解'),
('教育部门','68000011','上海市黄浦区xx路xx号',23,37.87,'张三','李四','15800000000','行政调解'),
('市场监管部门','68000012','上海市黄浦区xx路xx号',134,31.59,'张三','李四','15800000000','行政调解'),
('规划资源部门','68000013','上海市黄浦区xx路xx号',57,50.85,'张三','李四','15800000000','行政调解'),
('生态环境部门','68000014','上海市黄浦区xx路xx号',37,50.61,'张三','李四','15800000000','行政调解'),
('农业农村部门','68000015','上海市黄浦区xx路xx号',46,30.85,'张三','李四','15800000000','行政调解'),
('退役军人部门','68000016','上海市黄浦区xx路xx号',137,48.73,'张三','李四','15800000000','行政调解'),
('市场监管部门','68000017','上海市黄浦区xx路xx号',32,32.79,'张三','李四','15800000000','行政调解'),
('法学会','68000018','上海市黄浦区xx路xx号',195,57.28,'张三','李四','15800000000','专业调解'),
('人民调解委员会/行业专业调解委员会','68000019','上海市黄浦区xx路xx号',150,36.35,'张三','李四','15800000000','专业调解'),
('律所','68000020','上海市黄浦区xx路xx号',197,52.00,'张三','李四','15800000000','专业调解'),
('心理咨询公司','68000021','上海市黄浦区xx路xx号',121,30.74,'张三','李四','15800000000','专业调解')
ON CONFLICT (org_phone) DO UPDATE SET
    org_phone = EXCLUDED.org_phone,
    org_address = EXCLUDED.org_address,
    active_case_count = EXCLUDED.active_case_count,
    success_rate = EXCLUDED.success_rate,
    duty_person = EXCLUDED.duty_person,
    leader_name = EXCLUDED.leader_name,
    duty_phone = EXCLUDED.duty_phone,
    mediation_category = EXCLUDED.mediation_category,
    updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS case_disposal_workflow_record (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL,
    task_id VARCHAR(64),
    message_id VARCHAR(64),
    conversation_id VARCHAR(64),
    recommended_department VARCHAR(100),
    recommended_mediation_type VARCHAR(100),
    recommend_reason TEXT,
    backup_suggestion TEXT,
    rule_hints_hit TEXT,
    flow_level_1 VARCHAR(50),
    flow_level_2 VARCHAR(50),
    flow_level_3 VARCHAR(50),
    mediation_status VARCHAR(50),
    mediation_advice TEXT,
    raw_response TEXT,
    created_at TIMESTAMP NOT NULL
);

COMMENT ON TABLE case_disposal_workflow_record IS '纠纷处置workflow流水表';
COMMENT ON COLUMN case_disposal_workflow_record.case_id IS '案件ID';
COMMENT ON COLUMN case_disposal_workflow_record.task_id IS 'Dify任务ID';
COMMENT ON COLUMN case_disposal_workflow_record.message_id IS 'Dify消息ID';
COMMENT ON COLUMN case_disposal_workflow_record.conversation_id IS 'Dify会话ID';
COMMENT ON COLUMN case_disposal_workflow_record.recommended_department IS '推荐部门';
COMMENT ON COLUMN case_disposal_workflow_record.recommended_mediation_type IS '推荐调解类型';
COMMENT ON COLUMN case_disposal_workflow_record.recommend_reason IS '推荐原因';
COMMENT ON COLUMN case_disposal_workflow_record.backup_suggestion IS '备选建议';
COMMENT ON COLUMN case_disposal_workflow_record.rule_hints_hit IS '命中规则提示(JSON字符串)';
COMMENT ON COLUMN case_disposal_workflow_record.flow_level_1 IS '纠纷流转一级节点';
COMMENT ON COLUMN case_disposal_workflow_record.flow_level_2 IS '纠纷流转二级节点';
COMMENT ON COLUMN case_disposal_workflow_record.flow_level_3 IS '纠纷流转三级节点';
COMMENT ON COLUMN case_disposal_workflow_record.mediation_status IS '调解状态';
COMMENT ON COLUMN case_disposal_workflow_record.mediation_advice IS '调解建议';
COMMENT ON COLUMN case_disposal_workflow_record.raw_response IS '原始响应报文(JSON字符串)';
COMMENT ON COLUMN case_disposal_workflow_record.created_at IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_case_disposal_workflow_record_case_id ON case_disposal_workflow_record(case_id);
CREATE INDEX IF NOT EXISTS idx_case_disposal_workflow_record_created_at ON case_disposal_workflow_record(created_at DESC);

ALTER TABLE case_disposal_workflow_record ADD COLUMN IF NOT EXISTS mediation_status VARCHAR(50);

ALTER TABLE case_disposal_workflow_record ADD COLUMN IF NOT EXISTS mediation_advice TEXT;

CREATE TABLE IF NOT EXISTS case_stats_batch (
    id BIGSERIAL PRIMARY KEY,
    batch_no VARCHAR(64) NOT NULL UNIQUE,
    record_count INTEGER NOT NULL,
    imported_at TIMESTAMP NOT NULL,
    report_generated_at TIMESTAMP,
    report_file_url VARCHAR(512),
    created_at TIMESTAMP NOT NULL
);

COMMENT ON TABLE case_stats_batch IS '案件统计导入批次表';
COMMENT ON COLUMN case_stats_batch.batch_no IS '批次号';
COMMENT ON COLUMN case_stats_batch.record_count IS '批次记录数';
COMMENT ON COLUMN case_stats_batch.imported_at IS '批次导入时间';
COMMENT ON COLUMN case_stats_batch.report_generated_at IS '报告生成时间';
COMMENT ON COLUMN case_stats_batch.report_file_url IS '报告下载地址';

CREATE TABLE IF NOT EXISTS case_stats_detail (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL,
    serial_no VARCHAR(64),
    event_time VARCHAR(64),
    district VARCHAR(64),
    street_town VARCHAR(128),
    register_source VARCHAR(128),
    case_type VARCHAR(128),
    register_time VARCHAR(64),
    current_status VARCHAR(128),
    created_at TIMESTAMP NOT NULL
);

COMMENT ON TABLE case_stats_detail IS '案件统计导入明细表';
COMMENT ON COLUMN case_stats_detail.batch_id IS '所属批次ID';
COMMENT ON COLUMN case_stats_detail.serial_no IS '序号';
COMMENT ON COLUMN case_stats_detail.event_time IS '时间';
COMMENT ON COLUMN case_stats_detail.district IS '区';
COMMENT ON COLUMN case_stats_detail.street_town IS '街镇';
COMMENT ON COLUMN case_stats_detail.register_source IS '登记来源';
COMMENT ON COLUMN case_stats_detail.case_type IS '类型';
COMMENT ON COLUMN case_stats_detail.register_time IS '登记时间';
COMMENT ON COLUMN case_stats_detail.current_status IS '当前办理状态';

CREATE INDEX IF NOT EXISTS idx_case_stats_detail_batch_id ON case_stats_detail(batch_id);
ALTER TABLE case_stats_batch ADD COLUMN IF NOT EXISTS time_trend_json TEXT;
ALTER TABLE case_stats_batch ADD COLUMN IF NOT EXISTS street_top10_json TEXT;
ALTER TABLE case_stats_batch ADD COLUMN IF NOT EXISTS type_top10_json TEXT;
ALTER TABLE case_stats_batch ADD COLUMN IF NOT EXISTS district_status_json TEXT;
ALTER TABLE case_stats_batch ADD COLUMN IF NOT EXISTS time_chart_path VARCHAR(512);
ALTER TABLE case_stats_batch ADD COLUMN IF NOT EXISTS street_chart_path VARCHAR(512);
ALTER TABLE case_stats_batch ADD COLUMN IF NOT EXISTS type_chart_path VARCHAR(512);
ALTER TABLE case_stats_batch ADD COLUMN IF NOT EXISTS district_chart_path VARCHAR(512);
ALTER TABLE case_stats_batch ADD COLUMN IF NOT EXISTS report_file_path VARCHAR(512);

# 矛盾纠纷系统管理（控台 + Spring Boot后端）

## 1. 项目结构
- `frontend/`：控台页面（首页 + 案件管理页）
- `backend/`：Java 后端（Spring Boot + MyBatis-Plus + PostgreSQL + JDK8）

## 2. 前端页面设计
### 2.1 控台首页（`frontend/index.html`）
功能：
1. 案件描述文字输入。
2. 案件描述输入框（后台解析文字并入库）。
3. 事件来源选择框（来电求助/物业纠纷/其他线下接待）。
4. 上传 Excel（解析文本后入库）。
5. 上传音频（转写占位后入库）。
6. 点击“提交文字案件”会弹出解析进度弹窗并显示完成图标；首页不展示返回报文内容。

对应接口：
- `POST /api/cases/ingest/text`
- `POST /api/cases/ingest/excel`
- `POST /api/cases/ingest/audio`
- `POST /api/cases/intelligent-classify`

### 2.2 案件管理页（`frontend/cases.html`）
功能：
1. 按关键词、纠纷类型、事件来源、风险等级查询。
2. 表格展示案件主字段，并提供操作栏（智能助手按钮）。
3. 点击智能助手按钮弹出智能助手页面：顶部展示当事人信息与案件摘要；下方左侧展示智能工作流（React Flow（SmoothStep 折线+圆角）连接、节点可点击、从主节点到当前节点路径高亮绿色）；下方右侧为书签样式页签，优先展示智能指引；点击“办理时间轴”切换为竖状时间树展示。

对应接口：
- `GET /api/cases`
- `GET /api/cases/assistant-detail?caseId=1`

## 3. 后端接口设计
### 3.1 案件入库接口
1) 文字案件入库
- `POST /api/cases/ingest/text`
- Body:
```json
{
  "caseText": "邻里因噪音产生纠纷...",
  "eventSource": "来电求助"
}
```
- 处理逻辑：入库前先调用 Dify 要素提取工作流（`/workflows/run`）再执行落库。
- Dify 请求体按规范传递：`inputs`（必填对象）、`response_mode=streaming`、`user=abc-123`，并附带可选 `files` 与 `trace_id`（文本变量键使用 `material_text`）。流式响应为 `text/event-stream`，后端会解析 SSE 事件并提取 `workflow_finished.data.outputs` 作为结构化结果。

2) Excel 案件入库
- `POST /api/cases/ingest/excel`
- form-data: `file`

3) 音频案件入库
- `POST /api/cases/ingest/audio`
- form-data: `file`

4) 智能分类接口
- `POST /api/cases/intelligent-classify`
- Body:
```json
{
  "caseId": 1,
  "caseText": "邻里因噪音产生纠纷..."
}
```
- 处理逻辑：调用 Dify 工作流（与要素提取一致），但使用独立的 `dify.classify-api-key`，且分类工作流入参键使用 `dispute_info`。
- 分类回写：根据 Dify 输出回写 `case_record` 的 `dispute_type` 与 `risk_level`。
- 映射规则：`dispute_category_l1 -> dispute_type`，`dispute_category_l2 -> dispute_sub_type`。
- 同步落库：新增 `case_classify_record` 子表按智能分类报文字段拆分落库（如 `dispute_category_l1`、`dispute_category_l2`、`model_suggested_category_l1`、`model_suggested_category_l2`、`risk_level`、`facts_summary`、`judgement_basis`、`emotion_assessment`、`is_in_client_taxonomy`、`parse_error` 等）。

### 3.2 案件查询接口
- `GET /api/cases?keyword=纠纷&disputeType=邻里纠纷&eventSource=TEXT&riskLevel=中&pageNo=1&pageSize=10`

### 3.3 Dify预留接口（3个）
1. `POST /api/dify/workflow-run`
2. `POST /api/dify/chat-message`
3. `POST /api/dify/completion-message`

## 4. 数据库结构（PostgreSQL）
见 `backend/src/main/resources/schema.sql`。

核心表：`case_record`（案件主表字段）
- 当事人 `party_name`
- 对方当事人 `counterparty_name`
- 纠纷类型 `dispute_type`
- 纠纷子类型 `dispute_sub_type`（可为空）
- 事件来源 `event_source`
- 风险等级 `risk_level`
- 办理进度 `handling_progress`
- 接待人 `receiver`
- 登记时间 `register_time`

## 5. 日志能力
- 新增全局请求/响应日志过滤器，统一打印方法、路径、状态码、耗时。
- 对浏览器预检请求（OPTIONS）使用 `CORS-PREFLIGHT` 专用日志标识。
- 控制器与服务层增加关键入参/出参日志，便于排查问题。

## 6. 跨域说明
- 新增全局 CORS 配置，开放 `/api/**` 的 OPTIONS 预检与常用请求方法，避免前端跨域预检被 403 拒绝。

## 7. 本地启动
```bash
cd backend
mvn spring-boot:run
```

```bash
cd frontend
python3 -m http.server 5173
```

访问：
- 首页：http://localhost:5173/index.html
- 案件管理：http://localhost:5173/cases.html

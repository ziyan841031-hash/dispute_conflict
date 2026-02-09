# 矛盾纠纷系统管理（控台 + Spring Boot后端）

## 1. 项目结构
- `frontend/`：控台页面（首页 + 案件管理页）
- `backend/`：Java 后端（Spring Boot + MyBatis-Plus + PostgreSQL + JDK8）

## 2. 前端页面设计
### 2.1 控台首页（`frontend/index.html`）
功能：
1. 案件描述文字输入。
2. 录入案件主表字段：当事人、对方当事人、纠纷类型、风险等级、办理进度、接待人。
3. 上传 Excel（解析文本后入库）。
4. 上传音频（转写占位后入库）。

对应接口：
- `POST /api/cases/ingest/text`
- `POST /api/cases/ingest/excel`
- `POST /api/cases/ingest/audio`

### 2.2 案件管理页（`frontend/cases.html`）
功能：
1. 按关键词、纠纷类型、事件来源、风险等级查询。
2. 表格展示案件主字段，并提供操作栏（查看按钮）。

对应接口：
- `GET /api/cases`

## 3. 后端接口设计
### 3.1 案件入库接口
1) 文字案件入库
- `POST /api/cases/ingest/text`
- Body:
```json
{
  "caseText": "邻里因噪音产生纠纷...",
  "partyName": "张三",
  "counterpartyName": "李四",
  "disputeType": "邻里纠纷",
  "riskLevel": "中",
  "handlingProgress": "待处理",
  "receiver": "王接待"
}
```

2) Excel 案件入库
- `POST /api/cases/ingest/excel`
- form-data: `file`

3) 音频案件入库
- `POST /api/cases/ingest/audio`
- form-data: `file`

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
- 事件来源 `event_source`
- 风险等级 `risk_level`
- 办理进度 `handling_progress`
- 接待人 `receiver`
- 登记时间 `register_time`

## 5. 日志能力
- 新增全局请求/响应日志过滤器，统一打印方法、路径、状态码、耗时。
- 控制器与服务层增加关键入参/出参日志，便于排查问题。

## 6. 本地启动
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

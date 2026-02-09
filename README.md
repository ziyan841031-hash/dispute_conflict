# 矛盾纠纷系统管理（控台 + Spring Boot后端）

## 1. 项目结构

- `frontend/`：控台页面（首页 + 案件管理页）
- `backend/`：Java 后端（Spring Boot + MyBatis-Plus + PostgreSQL + JDK8）

## 2. 前端页面设计

### 2.1 控台首页（`frontend/index.html`）

功能：
1. 案件描述文字输入框提交。
2. Excel 文件上传并提交。
3. 音频文件上传并提交。

对应接口：
- `POST /api/cases/ingest/text`
- `POST /api/cases/ingest/excel`
- `POST /api/cases/ingest/audio`

### 2.2 案件管理页（`frontend/cases.html`）

功能：
1. 按关键词、来源类型查询。
2. 表格展示案件数据。

对应接口：
- `GET /api/cases`

## 3. 后端接口设计

### 3.1 案件入库接口

1) 文字案件入库
- `POST /api/cases/ingest/text`
- Body:
```json
{
  "caseText": "邻里因噪音产生纠纷..."
}
```

2) Excel 案件入库
- `POST /api/cases/ingest/excel`
- form-data: `file`
- 说明：解析首个sheet并拼接成文本后入库。

3) 音频案件入库
- `POST /api/cases/ingest/audio`
- form-data: `file`
- 说明：当前为“音频转写占位实现”，预留对接ASR服务。

### 3.2 案件查询接口

- `GET /api/cases?keyword=纠纷&sourceType=TEXT&pageNo=1&pageSize=10`
- 返回分页数据，可直接供案件管理页展示。

### 3.3 Dify预留接口（3个）

1. `POST /api/dify/workflow-run` -> 代理 Dify `/workflows/run`
2. `POST /api/dify/chat-message` -> 代理 Dify `/chat-messages`
3. `POST /api/dify/completion-message` -> 代理 Dify `/completion-messages`

配置项在 `backend/src/main/resources/application.yml`：
- `dify.base-url`
- `dify.api-key`

## 4. 数据库结构（PostgreSQL）

见 `backend/src/main/resources/schema.sql`。

核心表：`case_record`
- `id` 主键
- `case_no` 案件编号（唯一）
- `source_type` 来源类型（TEXT/EXCEL/AUDIO）
- `case_text` 解析后的文本
- `source_file_name` 原始文件名
- `audio_duration_sec` 音频时长（预留）
- `status` 案件状态
- `created_at` / `updated_at`

## 5. 本地启动

### 5.1 启动后端

```bash
cd backend
mvn spring-boot:run
```

### 5.2 启动前端静态页面

```bash
cd frontend
python3 -m http.server 5173
```

访问：
- 首页：http://localhost:5173/index.html
- 案件管理：http://localhost:5173/cases.html


# CLAUDE.md — Dispute Conflict Management System

## Project Overview

This is a Chinese dispute/conflict case management system (矛盾纠纷系统管理). It provides multi-channel case ingestion (text, Excel, audio), AI-powered classification and mediation recommendations via the Dify platform, and a workflow visualization UI.

---

## Repository Structure

```
dispute_conflict/
├── backend/                          # Java Spring Boot backend (port 8080)
│   ├── pom.xml                       # Maven build configuration (Java 8, Spring Boot 2.7.18)
│   └── src/main/
│       ├── java/com/example/dispute/
│       │   ├── DisputeConflictApplication.java   # Entry point
│       │   ├── client/DifyClient.java            # Dify AI HTTP client
│       │   ├── config/                           # CORS, MyBatis-Plus, logging filter
│       │   ├── controller/                       # REST controllers
│       │   ├── dto/                              # Request/response DTOs
│       │   ├── entity/                           # JPA/MyBatis-Plus entities
│       │   ├── mapper/                           # MyBatis-Plus mapper interfaces
│       │   └── service/                          # Service interfaces + impl/
│       └── resources/
│           ├── application.yml                   # All app configuration
│           └── schema.sql                        # DB init (auto-runs on startup)
└── frontend/                         # Vanilla JS + HTML frontend (port 5173)
    ├── index.html                    # Case submission page
    ├── cases.html                    # Case management/query page
    ├── assistant.html                # AI assistant + workflow visualization page
    ├── main.js                       # All frontend logic
    └── styles.css                    # Styling
```

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Language | Java 8 |
| Framework | Spring Boot 2.7.18 |
| Build | Maven |
| ORM | MyBatis-Plus 3.5.5 |
| Database | PostgreSQL |
| File parsing | Apache POI 5.2.5 (Excel) |
| File storage | Alibaba Cloud OSS SDK 3.17.4 |
| Audio transcription | DashScope SDK 2.22.9 (Alibaba) |
| AI workflows | Dify platform (HTTP/SSE) |
| Boilerplate reduction | Lombok |

### Frontend
| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES5/ES6) |
| Markup | HTML5 |
| Styling | CSS3 |
| Workflow visualization | React Flow (CDN, UMD) + React 18 |
| API communication | Fetch API |

---

## Development Setup

### Prerequisites
- Java 8 (JDK 1.8)
- Maven 3.x
- PostgreSQL 12+ running on `localhost:5432`
- Python 3 (for frontend dev server)

### Database Setup
Create the database before first run:
```sql
CREATE DATABASE dispute_conflict;
-- Schema and seed data are auto-applied from schema.sql on startup
```

### Backend
```bash
cd backend

# Run in development mode
mvn spring-boot:run

# Build a deployable JAR
mvn clean package
java -jar target/dispute-conflict-backend-1.0.0.jar
```

Backend runs on **http://localhost:8080**. API prefix: `/api`.

### Frontend
```bash
cd frontend
python3 -m http.server 5173
```

Frontend pages:
- **http://localhost:5173/index.html** — case submission
- **http://localhost:5173/cases.html** — case management
- **http://localhost:5173/assistant.html** — AI assistant

---

## Configuration (`backend/src/main/resources/application.yml`)

All sensitive credentials must be set in `application.yml` before running. There are **no environment variable overrides** wired up by default — edit the YAML file directly for local dev, or use Spring Boot profiles for different environments.

### Required Settings

| Key | Description |
|---|---|
| `spring.datasource.url` | PostgreSQL JDBC URL (default: `jdbc:postgresql://localhost:5432/dispute_conflict`) |
| `spring.datasource.username` | DB user (default: `postgres`) |
| `spring.datasource.password` | DB password (default: `postgres`) |
| `dify.base-url` | Dify platform base URL |
| `dify.api-key` | Dify text-extraction workflow API key |
| `dify.classify-api-key` | Dify classification workflow API key |
| `dify.disposal-api-key` | Dify disposal workflow API key |
| `dify.mediator-suggestion-api-key` | Dify mediator suggestion API key |
| `dify.extract-user` | User ID sent to Dify |
| `dify.extract-workflow-endpoint` | Dify workflow endpoint path |
| `oss.endpoint` | Alibaba OSS endpoint |
| `oss.bucket-name` | OSS bucket |
| `oss.access-key-id` | OSS access key |
| `oss.access-key-secret` | OSS secret key |
| `oss.url-prefix` | Public URL prefix for uploaded files |
| `dashscope.sound-api-key` | DashScope audio transcription API key |

---

## API Endpoints

### Case Management — `CaseController`
| Method | Path | Description |
|---|---|---|
| POST | `/api/cases/ingest/text` | Submit a case as plain text |
| POST | `/api/cases/ingest/excel` | Upload an Excel file with cases |
| POST | `/api/cases/ingest/audio` | Upload an audio file for transcription |
| GET | `/api/cases` | Query/filter cases (paginated) |
| POST | `/api/cases/intelligent-classify` | Trigger AI classification on a case |
| GET | `/api/cases/assistant-detail` | Get enriched case detail for the assistant UI |

### Dify AI Workflows — `DifyController`
| Method | Path | Description |
|---|---|---|
| POST | `/api/dify/workflow-run` | Execute a Dify workflow |
| POST | `/api/dify/workflow-confirm` | Confirm a mediation workflow result |
| POST | `/api/dify/chat-message` | Chat with Dify |
| POST | `/api/dify/completion-message` | Completion-style request to Dify |

### Organization Dictionary — `DisposalOrgDictController`
| Method | Path | Description |
|---|---|---|
| GET | `/api/disposal-orgs` | List all mediation organizations |

All responses use the unified `ApiResponse<T>` wrapper: `{ code, message, data }`.

---

## Database Schema

Four tables are created and populated automatically from `schema.sql`:

### `case_record`
Primary case data. Key columns: `case_no`, `party_name`, `counterparty_name`, `dispute_type`, `dispute_sub_type`, `event_source`, `risk_level`, `handling_progress`, `case_text`, `audio_duration_sec`, `register_time`.

### `case_classify_record`
AI classification output per case. Key columns: `case_id` (FK), `dispute_category_l1/l2`, `model_suggested_category_l1/l2`, `risk_level`, `facts_summary`, `emotion_assessment`, `workflow_run_id`.

### `disposal_org_dict`
Dictionary of 22 pre-seeded mediation organizations. Key columns: `org_name`, `org_phone`, `mediation_category`, `success_rate`, `active_case_count`.

### `case_disposal_workflow_record`
Records each Dify workflow invocation. Key columns: `case_id`, `task_id`, `recommended_department`, `recommended_mediation_type`, `flow_level_1/2/3`, `mediation_advice`, `mediation_status`, `raw_response`.

---

## Code Architecture Conventions

### Backend Layering (strictly follow this)
```
Controller → Service (interface) → ServiceImpl → Mapper → Entity
```
- **Controllers** handle HTTP, validate input, call services, return `ApiResponse<T>`.
- **Services** (interfaces in `service/`, impls in `service/impl/`) contain business logic.
- **Mappers** are MyBatis-Plus interfaces extending `BaseMapper<T>` — no XML needed for basic CRUD.
- **Entities** use Lombok (`@Data`, `@Builder`, etc.) and MyBatis-Plus annotations (`@TableName`, `@TableId`).
- **DTOs** live in `dto/` and are used for request/response objects, not entities.

### Naming Conventions
- Classes: `PascalCase` (e.g., `CaseRecord`, `DifyClient`)
- Methods/fields: `camelCase`
- DB columns: `snake_case` mapped via `@TableField`
- REST paths: `kebab-case` (e.g., `/ingest/text`, `/intelligent-classify`)
- Constants: `UPPER_SNAKE_CASE`

### Response Format
All endpoints return `ApiResponse<T>`:
```java
ApiResponse.success(data)       // { code: 200, message: "ok", data: ... }
ApiResponse.error("message")    // { code: 500, message: "...", data: null }
```

### CORS
Global CORS is configured in `CorsConfig.java` to allow all origins for `/api/**`. Adjust `allowedOrigins` before production deployment.

### Logging
`RequestResponseLoggingFilter` logs every request/response with timing. SQL logs are enabled in `application.yml` for development. Disable SQL logging in production by setting `logging.level.com.example.dispute.mapper: warn`.

### Dify Integration (`DifyClient.java`)
- Dify workflows return **streaming SSE responses** — `DifyClient` parses the stream to extract the final output.
- Each workflow type (extract, classify, disposal, mediator-suggestion) has a **separate API key** configured in `application.yml`.
- Track workflow executions via `task_id` / `workflow_run_id` returned by Dify and stored in `case_disposal_workflow_record`.

### Frontend Conventions
- All API calls go to `API_BASE = 'http://localhost:8080/api'` in `main.js`.
- React Flow is loaded dynamically from CDN — do not add a build step unless the project migrates to a bundler.
- Page-specific logic is organized in named functions within `main.js`; there is no module system.

---

## Testing

There are currently **no automated tests** in this repository. When adding tests:
- Place unit tests in `backend/src/test/java/com/example/dispute/`
- Use Spring Boot Test with `@SpringBootTest` for integration tests
- Run with: `mvn test`

---

## Git Workflow

### Active Branches
- `master` / `main` — stable baseline
- `codex` — primary development branch (most active)
- `0311` — date-stamped feature branch
- Feature branches follow pattern: `<feature-description>` (e.g., `add-home-page-to-menu-bar`)

### Commit Message Style
The project uses conventional commit messages:
```
feat: add new feature
fix: correct a bug
style: UI or formatting changes
refactor: code restructuring without behavior change
chore: build/config changes
```

### Development Flow
1. Branch from `codex` for new features
2. Commit with descriptive messages following the style above
3. Push and merge back to `codex`
4. Merge `codex` → `master` for stable releases

---

## Known Limitations & TODOs

- **No CI/CD**: No GitHub Actions, Jenkins, or Docker configuration exists. Deployment is manual.
- **No Docker**: No `Dockerfile` or `docker-compose.yml`. Local setup requires manual DB and service configuration.
- **API keys in YAML**: Credentials are stored directly in `application.yml` — use Spring Boot profiles or environment variable injection for real deployments.
- **No tests**: Unit and integration tests need to be added.
- **SQL logging enabled in dev**: Turn off for production (`logging.level.com.example.dispute.mapper`).
- **Frontend lacks a build step**: React Flow is loaded from CDN; migrating to Vite/Webpack would improve performance and maintainability.

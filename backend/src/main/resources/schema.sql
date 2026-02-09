CREATE TABLE IF NOT EXISTS case_record (
    id BIGSERIAL PRIMARY KEY,
    case_no VARCHAR(64) NOT NULL UNIQUE,
    source_type VARCHAR(20) NOT NULL,
    case_text TEXT NOT NULL,
    source_file_name VARCHAR(255),
    audio_duration_sec INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_record_source_type ON case_record(source_type);
CREATE INDEX IF NOT EXISTS idx_case_record_created_at ON case_record(created_at DESC);

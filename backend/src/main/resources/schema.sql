CREATE TABLE IF NOT EXISTS case_record (
    id BIGSERIAL PRIMARY KEY,
    case_no VARCHAR(64) NOT NULL UNIQUE,
    party_name VARCHAR(100) NOT NULL,
    counterparty_name VARCHAR(100) NOT NULL,
    dispute_type VARCHAR(50) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_case_record_dispute_type ON case_record(dispute_type);
CREATE INDEX IF NOT EXISTS idx_case_record_event_source ON case_record(event_source);
CREATE INDEX IF NOT EXISTS idx_case_record_register_time ON case_record(register_time DESC);

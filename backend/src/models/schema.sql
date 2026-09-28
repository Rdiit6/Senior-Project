-- =====================================================================
-- MindMeter — PostgreSQL schema (Proof of Concept)
-- Target: Azure Database for PostgreSQL (PostgreSQL 13+; tested on 16)
-- Owner: Backend/Cloud. Matches the frozen API contract in Final PRD v1.0.
-- =====================================================================

-- ---------- Enum types ----------
CREATE TYPE checkin_source  AS ENUM ('online', 'offline_sync');
CREATE TYPE analysis_status AS ENUM ('pending', 'done', 'failed');
CREATE TYPE sentiment_label AS ENUM ('positive', 'neutral', 'negative');
CREATE TYPE resource_type   AS ENUM ('crisis', 'counselling', 'self_help');

-- ---------- users: anonymous students (no name/email stored) ----------
-- The browser generates a random token once and keeps it in localStorage.
-- The backend stores only a SHA-256 hash of that token, never the token itself.
CREATE TABLE users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    anon_token_hash   TEXT        NOT NULL UNIQUE,
    is_demo           BOOLEAN     NOT NULL DEFAULT false,   -- seed/demo account for the presentation
    reminder_enabled  BOOLEAN     NOT NULL DEFAULT true,    -- retention: gentle daily reminder
    reminder_time     TIME        NOT NULL DEFAULT '20:00', -- WIB
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- checkins: one mood entry per user per day ----------
CREATE TABLE checkins (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood_value   SMALLINT       NOT NULL CHECK (mood_value BETWEEN 1 AND 5),
    note_text    VARCHAR(200),                               -- optional; sensitive
    check_date   DATE           NOT NULL,                    -- local WIB date of the check-in
    client_ts    TIMESTAMPTZ,                                -- when the tap happened on the device (offline sync)
    source       checkin_source NOT NULL DEFAULT 'online',
    crisis_flag  BOOLEAN        NOT NULL DEFAULT false,      -- set by backend keyword check only
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_checkin_user_day UNIQUE (user_id, check_date)  -- repeat same-day check-in = update
);
CREATE INDEX idx_checkins_user_date ON checkins (user_id, check_date DESC);

-- ---------- note_analyses: LLM result for a check-in's note (0..1 per check-in) ----------
-- Separate table so a slow or failed OpenRouter call never blocks saving the check-in.
CREATE TABLE note_analyses (
    id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id     UUID            NOT NULL UNIQUE REFERENCES checkins(id) ON DELETE CASCADE,
    status         analysis_status NOT NULL DEFAULT 'pending',
    sentiment      sentiment_label,
    score          NUMERIC(4,3)    CHECK (score BETWEEN 0 AND 1),
    model_name     TEXT,                                     -- OpenRouter model string actually used
    error_message  TEXT,
    analyzed_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_done_has_sentiment CHECK (status <> 'done' OR sentiment IS NOT NULL)
);

-- ---------- themes: fixed vocabulary (sleep, workload, ...) ----------
CREATE TABLE themes (
    id        SMALLSERIAL PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,    -- used in API as themes[] / tags[]
    label_id  TEXT NOT NULL            -- Indonesian display label
);

-- analyses <-> themes (many-to-many)
CREATE TABLE analysis_themes (
    analysis_id  UUID     NOT NULL REFERENCES note_analyses(id) ON DELETE CASCADE,
    theme_id     SMALLINT NOT NULL REFERENCES themes(id),
    PRIMARY KEY (analysis_id, theme_id)
);

-- ---------- resources: support contacts and self-help ----------
CREATE TABLE resources (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    title              TEXT          NOT NULL,
    description        TEXT          NOT NULL,
    url                TEXT,
    phone              TEXT,
    type               resource_type NOT NULL,
    is_primary_crisis  BOOLEAN       NOT NULL DEFAULT false, -- shown first on the crisis screen
    sort_order         SMALLINT      NOT NULL DEFAULT 0,
    active             BOOLEAN       NOT NULL DEFAULT true,
    verified_at        DATE,                                  -- when the team last confirmed the contact
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_resource_has_contact CHECK (url IS NOT NULL OR phone IS NOT NULL)
);
-- at most one primary crisis contact
CREATE UNIQUE INDEX uq_one_primary_crisis ON resources (is_primary_crisis) WHERE is_primary_crisis;

-- resources <-> themes (many-to-many), used to match a resource to a detected theme
CREATE TABLE resource_themes (
    resource_id  UUID     NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    theme_id     SMALLINT NOT NULL REFERENCES themes(id),
    PRIMARY KEY (resource_id, theme_id)
);

-- ---------- crisis_keywords: editable list for the backend safety check ----------
CREATE TABLE crisis_keywords (
    id      SERIAL  PRIMARY KEY,
    phrase  TEXT    NOT NULL UNIQUE,   -- store lowercase
    lang    CHAR(2) NOT NULL DEFAULT 'id',
    active  BOOLEAN NOT NULL DEFAULT true
);

-- ---------- Reference data: theme vocabulary ----------
INSERT INTO themes (code, label_id) VALUES
    ('sleep',      'Tidur'),
    ('workload',   'Beban tugas'),
    ('exams',      'Ujian'),
    ('isolation',  'Merasa sendiri'),
    ('relationships', 'Hubungan'),
    ('finance',    'Keuangan'),
    ('health',     'Kesehatan fisik'),
    ('motivation', 'Motivasi');

-- Resources and crisis keywords are NOT seeded here on purpose:
-- the team must verify every contact on the official UGM page before inserting it,
-- and supply the crisis keyword list.

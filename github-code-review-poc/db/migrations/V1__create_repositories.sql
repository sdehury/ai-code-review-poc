CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS repositories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)    NOT NULL,
    owner           VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(512)    NOT NULL UNIQUE,
    github_url      TEXT            NOT NULL,
    branch          VARCHAR(255)    NOT NULL DEFAULT 'main',
    access_token_enc TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositories_full_name ON repositories(full_name);
CREATE INDEX IF NOT EXISTS idx_repositories_is_active  ON repositories(is_active);

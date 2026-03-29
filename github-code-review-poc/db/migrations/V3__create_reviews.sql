CREATE TABLE IF NOT EXISTS reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commit_id       UUID            NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    repository_id   UUID            NOT NULL REFERENCES repositories(id),
    status          VARCHAR(50)     NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER,
    overall_score   NUMERIC(5,2),
    security_score  NUMERIC(5,2),
    quality_score   NUMERIC(5,2),
    techdebt_score  NUMERIC(5,2),
    summary         TEXT,
    ai_review_text  TEXT,
    error_message   TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_commit_id     ON reviews(commit_id);
CREATE INDEX IF NOT EXISTS idx_reviews_repository_id ON reviews(repository_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status        ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_completed_at  ON reviews(completed_at DESC);

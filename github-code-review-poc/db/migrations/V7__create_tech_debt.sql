CREATE TABLE IF NOT EXISTS tech_debt_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id   UUID            NOT NULL REFERENCES repositories(id),
    snapshot_date   DATE            NOT NULL,
    total_issues    INTEGER         NOT NULL DEFAULT 0,
    critical_count  INTEGER         NOT NULL DEFAULT 0,
    high_count      INTEGER         NOT NULL DEFAULT 0,
    medium_count    INTEGER         NOT NULL DEFAULT 0,
    low_count       INTEGER         NOT NULL DEFAULT 0,
    debt_minutes    INTEGER         NOT NULL DEFAULT 0,
    debt_ratio      NUMERIC(5,2),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_debt_snapshots_repo_date ON tech_debt_snapshots(repository_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS schedule_configs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id       UUID            NOT NULL UNIQUE REFERENCES repositories(id) ON DELETE CASCADE,
    cron_expression     VARCHAR(100)    NOT NULL DEFAULT '0 */6 * * *',
    branch_pattern      VARCHAR(255)    NOT NULL DEFAULT 'develop',
    lookback_days       INTEGER         NOT NULL DEFAULT 7,
    max_commits_per_run INTEGER         NOT NULL DEFAULT 50,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    last_run_at         TIMESTAMPTZ,
    next_run_at         TIMESTAMPTZ,
    last_run_status     VARCHAR(50),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_configs_repo ON schedule_configs(repository_id);
CREATE INDEX IF NOT EXISTS idx_schedule_configs_active ON schedule_configs(is_active);

CREATE TABLE IF NOT EXISTS developers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_login            VARCHAR(255)    NOT NULL UNIQUE,
    name                    VARCHAR(255),
    email                   VARCHAR(255),
    avatar_url              TEXT,
    total_commits           INTEGER         NOT NULL DEFAULT 0,
    total_additions         INTEGER         NOT NULL DEFAULT 0,
    total_deletions         INTEGER         NOT NULL DEFAULT 0,
    critical_findings_count INTEGER         NOT NULL DEFAULT 0,
    high_findings_count     INTEGER         NOT NULL DEFAULT 0,
    risk_score              NUMERIC(5,2)    NOT NULL DEFAULT 0.0,
    first_seen_at           TIMESTAMPTZ,
    last_seen_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS developer_commits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id    UUID NOT NULL REFERENCES developers(id),
    commit_id       UUID NOT NULL REFERENCES commits(id),
    repository_id   UUID NOT NULL REFERENCES repositories(id),
    UNIQUE(developer_id, commit_id)
);

CREATE INDEX IF NOT EXISTS idx_developer_commits_dev  ON developer_commits(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_commits_repo ON developer_commits(repository_id);

CREATE TABLE IF NOT EXISTS commits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id   UUID            NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha             VARCHAR(40)     NOT NULL,
    message         TEXT,
    author_email    VARCHAR(255),
    author_name     VARCHAR(255),
    committed_at    TIMESTAMPTZ     NOT NULL,
    files_changed   INTEGER         NOT NULL DEFAULT 0,
    additions       INTEGER         NOT NULL DEFAULT 0,
    deletions       INTEGER         NOT NULL DEFAULT 0,
    review_status   VARCHAR(50)     NOT NULL DEFAULT 'PENDING'
                    CHECK (review_status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED','SKIPPED')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, sha)
);

CREATE INDEX IF NOT EXISTS idx_commits_repository_id ON commits(repository_id);
CREATE INDEX IF NOT EXISTS idx_commits_committed_at  ON commits(committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_commits_review_status ON commits(review_status);
CREATE INDEX IF NOT EXISTS idx_commits_author_email  ON commits(author_email);

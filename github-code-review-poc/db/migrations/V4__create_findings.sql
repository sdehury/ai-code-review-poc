CREATE TABLE IF NOT EXISTS findings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id           UUID            NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    commit_id           UUID            NOT NULL REFERENCES commits(id),
    category            VARCHAR(50)     NOT NULL
                        CHECK (category IN ('SECURITY','TECH_DEBT','CODE_QUALITY','DEPENDENCY','STYLE')),
    severity            VARCHAR(20)     NOT NULL
                        CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
    rule_id             VARCHAR(100),
    title               VARCHAR(500)    NOT NULL,
    description         TEXT,
    file_path           TEXT,
    line_start          INTEGER,
    line_end            INTEGER,
    code_snippet        TEXT,
    recommendation      TEXT,
    cwe_id              VARCHAR(20),
    owasp_category      VARCHAR(100),
    is_false_positive   BOOLEAN         NOT NULL DEFAULT FALSE,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_review_id    ON findings(review_id);
CREATE INDEX IF NOT EXISTS idx_findings_commit_id    ON findings(commit_id);
CREATE INDEX IF NOT EXISTS idx_findings_category     ON findings(category);
CREATE INDEX IF NOT EXISTS idx_findings_severity     ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_unresolved   ON findings(resolved_at) WHERE resolved_at IS NULL;

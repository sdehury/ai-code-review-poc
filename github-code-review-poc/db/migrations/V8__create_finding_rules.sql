CREATE TABLE IF NOT EXISTS finding_rules (
    id              VARCHAR(100)    PRIMARY KEY,
    category        VARCHAR(50)     NOT NULL,
    severity        VARCHAR(20)     NOT NULL,
    title           VARCHAR(500)    NOT NULL,
    description     TEXT,
    cwe_id          VARCHAR(20),
    recommendation  TEXT
);

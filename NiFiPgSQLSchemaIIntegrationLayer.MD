# Technical Analysis: Apache NiFi — PostgreSQL Schema Replication to PostgreSQL / MS SQL Server Datamart

**Document Classification:** Internal — Leadership Decision Brief
**Version:** 1.0
**Date:** March 29, 2026
**Prepared by:** Enterprise Architecture & Technology Office
**Audience:** CTO, VP Engineering, Director of Data Engineering, IT Leadership

---

## 1. Executive Summary

The enterprise requires a reliable, scalable, and operationally transparent mechanism to **replicate an entire PostgreSQL schema** — including its tables, relationships, and data — to one of two target destinations:

| Target Option | Use Case |
|---------------|----------|
| **Target A:** Another PostgreSQL schema (same or different instance) | Development/staging environments, read-replica offloading, cross-domain data sharing |
| **Target B:** Microsoft SQL Server Datamart | Enterprise BI/MIS reporting via Power BI, cross-platform analytics, regulatory data segregation |

This document presents the **architecture, design patterns, resource requirements, cost analysis, and risk assessment** for both replication targets using **Apache NiFi** as the integration platform. It provides the data leadership needs to approve the design direction and authorize implementation.

---

## 2. Why Apache NiFi for Schema Replication

Apache NiFi was selected as the integration platform based on the prior architectural decision (ref: TechAnalysisPowerBIIntegrationLayer.MD). The following capabilities make NiFi uniquely suited for schema replication:

| Capability | Relevance to Schema Replication |
|------------|--------------------------------|
| **Database-native processors** | `ExecuteSQL`, `QueryDatabaseTable`, `PutDatabaseRecord`, `ConvertRecord` provide end-to-end database-to-database flow |
| **Incremental extraction** | `GenerateTableFetch` supports watermark-based CDC (Change Data Capture) without database-side configuration |
| **Schema awareness** | Avro schema inference from JDBC metadata; automatic type mapping between source and target |
| **Parallelism** | Concurrent table replication with configurable thread pools; each table can flow independently |
| **Backpressure** | Prevents target database overload during large initial loads or burst replication |
| **Data provenance** | Every row movement is auditable — critical for compliance and data governance |
| **Error isolation** | Failure in one table's replication does not halt the entire schema — flows are independent |

---

## 3. Architecture Design

### 3.1 High-Level Architecture

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                   APACHE NIFI CLUSTER                   │
                        │                                                         │
┌──────────────┐        │  ┌─────────────┐   ┌────────────┐   ┌──────────────┐   │        ┌──────────────────┐
│  PostgreSQL  │        │  │  EXTRACT    │   │ TRANSFORM  │   │    LOAD      │   │        │  TARGET A:       │
│  Source      │───────▶│  │             │──▶│            │──▶│              │───▶│───────▶│  PostgreSQL      │
│  Schema      │  JDBC  │  │ QueryDB     │   │ ConvertRec │   │ PutDBRecord  │   │  JDBC  │  Target Schema   │
│              │        │  │ GenTableFtch│   │ UpdateAttr │   │              │   │        │                  │
└──────────────┘        │  │ ExecuteSQL  │   │ JoltTransf │   │              │   │        └──────────────────┘
                        │  └─────────────┘   └────────────┘   └──────────────┘   │
                        │                                            │            │        ┌──────────────────┐
                        │                                            │            │        │  TARGET B:       │
                        │                                            └────────────│───────▶│  MS SQL Server   │
                        │                                                         │  JDBC  │  Datamart        │
                        │  ┌───────────────────────────────────────────────────┐  │        │                  │
                        │  │  ORCHESTRATION LAYER                              │  │        └──────────────────┘
                        │  │  • Schema Discovery (ListDatabaseTables)          │  │
                        │  │  • DDL Synchronization (ExecuteSQL for CREATE)    │  │
                        │  │  • Dependency Ordering (FK-aware sequencing)      │  │
                        │  │  • Watermark State Management                    │  │
                        │  └───────────────────────────────────────────────────┘  │
                        │                                                         │
                        └─────────────────────────────────────────────────────────┘
```

### 3.2 Replication Modes

The design supports three replication modes, selectable per table:

| Mode | Description | NiFi Strategy | Latency | Use Case |
|------|-------------|---------------|---------|----------|
| **Full Load** | Truncate target, reload entire table | `ExecuteSQL` → `PutDatabaseRecord` with pre-SQL `TRUNCATE` | Minutes–Hours (depends on volume) | Dimension tables, reference data, initial seed |
| **Incremental (Watermark)** | Extract only rows changed since last run | `GenerateTableFetch` with `Maximum-value Columns` (timestamp/ID) | 1–5 minutes | Fact tables, transaction logs, append-heavy tables |
| **CDC (Change Data Capture)** | Capture INSERT/UPDATE/DELETE via logical replication slot | `CaptureChangePostgreSQL` (NiFi 1.16+) or Debezium + Kafka → NiFi | Near-real-time (<30 sec) | Mission-critical tables, real-time dashboards |

### 3.3 Detailed Flow Design — Per-Table Replication

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     NiFi Flow: Single Table Replication                  │
│                                                                          │
│  ┌─────────────────┐                                                     │
│  │ GenerateTableFetch│   Generates SQL SELECT with watermark tracking    │
│  │ (or ExecuteSQL)  │   "SELECT * FROM src.orders WHERE updated_at > ?" │
│  └────────┬─────────┘                                                    │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐                                                     │
│  │  ExecuteSQL      │   Executes the generated query against PgSQL      │
│  │                  │   Returns Avro-encoded result set                  │
│  └────────┬─────────┘                                                    │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐                                                     │
│  │  ConvertRecord   │   Avro → JSON (optional, for inspection/debug)    │
│  │  (Optional)      │   Or Avro → Avro with schema transformation       │
│  └────────┬─────────┘                                                    │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐                                                     │
│  │  UpdateAttribute │   Set target table name, schema, batch metadata   │
│  │                  │   Route to correct target (PgSQL or MSSQL)        │
│  └────────┬─────────┘                                                    │
│           │                                                              │
│       ┌───┴───┐                                                          │
│       │ Route │  RouteOnAttribute: target.type == 'postgresql'           │
│       │       │                    target.type == 'mssql'                │
│       └───┬───┘                                                          │
│      ┌────┴────┐                                                         │
│      ▼         ▼                                                         │
│  ┌────────┐ ┌────────┐                                                   │
│  │PutDB   │ │PutDB   │                                                   │
│  │Record  │ │Record  │                                                   │
│  │(PgSQL) │ │(MSSQL) │                                                   │
│  └───┬────┘ └───┬────┘                                                   │
│      │          │                                                        │
│      ▼          ▼                                                        │
│  ┌──────────────────┐                                                    │
│  │  LogAttribute +   │   Success logging / provenance                   │
│  │  UpdateState      │   Persist watermark for next incremental run     │
│  └──────────────────┘                                                    │
│                                                                          │
│  ── FAILURE PATH ──────────────────────────────────────────────────────  │
│                                                                          │
│  ┌──────────────────┐                                                    │
│  │  RetryFlowFile   │   Configurable retry: 3 attempts, exponential    │
│  │                  │   backoff (5s, 30s, 120s)                         │
│  └────────┬─────────┘                                                    │
│           │ (after max retries)                                          │
│           ▼                                                              │
│  ┌──────────────────┐                                                    │
│  │  PutFile (DLQ)   │   Dead-letter directory for manual inspection    │
│  │  + Notify        │   Alert via PagerDuty/Slack/Email                 │
│  └──────────────────┘                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Schema Discovery & DDL Synchronization

Before data replication begins, the target schema structure must exist. NiFi handles this via an orchestration flow:

```
┌────────────────────┐     ┌─────────────────────┐     ┌────────────────────────┐
│  ListDatabaseTables│────▶│  ExecuteSQL          │────▶│  ExecuteSQL            │
│  (Source PgSQL)    │     │  (Extract DDL via    │     │  (Execute CREATE TABLE │
│                    │     │   pg_dump --schema-  │     │   on target with type  │
│  Discovers all     │     │   only or            │     │   mapping applied)     │
│  tables in schema  │     │   information_schema │     │                        │
└────────────────────┘     │   queries)           │     └────────────────────────┘
                           └─────────────────────┘
```

**Critical: Data Type Mapping (PostgreSQL → MS SQL Server)**

| PostgreSQL Type | MS SQL Server Equivalent | Notes |
|----------------|-------------------------|-------|
| `SERIAL` / `BIGSERIAL` | `INT IDENTITY` / `BIGINT IDENTITY` | Auto-increment mapping |
| `TEXT` | `NVARCHAR(MAX)` | Unicode support preserved |
| `VARCHAR(n)` | `NVARCHAR(n)` | Character limit preserved |
| `BOOLEAN` | `BIT` | `true/false` → `1/0` |
| `TIMESTAMP` | `DATETIME2` | Higher precision in MSSQL |
| `TIMESTAMPTZ` | `DATETIMEOFFSET` | Timezone-aware mapping |
| `JSONB` / `JSON` | `NVARCHAR(MAX)` | No native JSON type in MSSQL; store as string |
| `UUID` | `UNIQUEIDENTIFIER` | Direct mapping |
| `BYTEA` | `VARBINARY(MAX)` | Binary data |
| `NUMERIC(p,s)` | `DECIMAL(p,s)` | Precision preserved |
| `ARRAY` types | Normalized to separate table or JSON string | No native array support in MSSQL |
| `INTERVAL` | `NVARCHAR(50)` or computed columns | No native interval type in MSSQL |
| `INET` / `CIDR` | `NVARCHAR(45)` | Store as string representation |
| `HSTORE` | `NVARCHAR(MAX)` as JSON | Flatten to JSON key-value |

---

## 4. Detailed Comparison: Target A (PostgreSQL) vs Target B (MS SQL Server)

### 4.1 Architectural Complexity

| Dimension | Target A: PostgreSQL → PostgreSQL | Target B: PostgreSQL → MS SQL Server |
|-----------|:---------------------------------:|:------------------------------------:|
| **Schema Compatibility** | Identical — no type mapping needed | Requires comprehensive type mapping (see Section 3.4) |
| **DDL Replication** | Direct `pg_dump` → `psql` or NiFi `ExecuteSQL` | Must generate MSSQL-compatible DDL with translated types |
| **Data Type Fidelity** | 100% — lossless replication | 85–95% — some types require conversion (JSONB, ARRAY, INTERVAL) |
| **Collation Handling** | Same collation framework | Cross-platform collation mapping required (UTF-8 → SQL_Latin1) |
| **Constraint Replication** | CHECK, FK, UNIQUE — direct copy | CHECK syntax differs; FK constraints require dependency ordering |
| **Index Replication** | GiST, GIN, B-tree — direct copy | B-tree only (GiST/GIN not available); partial indexes not supported |
| **Stored Procedures / Functions** | PL/pgSQL — can be replicated | Must be rewritten in T-SQL (out of scope for NiFi; manual effort) |
| **Sequence Replication** | Direct sequence copy | Mapped to IDENTITY or manual sequence table |
| **NiFi Processor Config** | Single JDBC driver (PostgreSQL) | Two JDBC drivers (PostgreSQL source + MSSQL target) |
| **Connection Pooling** | `DBCPConnectionPool` (PostgreSQL) | Separate `DBCPConnectionPool` instances for each database |

### 4.2 Performance Characteristics

| Metric | Target A: PgSQL → PgSQL | Target B: PgSQL → MS SQL Server | Notes |
|--------|:-----------------------:|:-------------------------------:|-------|
| **Throughput (Full Load)** | 50,000 – 120,000 rows/sec | 30,000 – 80,000 rows/sec | MSSQL JDBC bulk insert is slower than PgSQL COPY |
| **Throughput (Incremental)** | 10,000 – 50,000 rows/sec | 8,000 – 35,000 rows/sec | Depends on batch size and network latency |
| **Latency (End-to-End)** | 2 – 15 seconds | 5 – 30 seconds | Type conversion adds overhead for MSSQL target |
| **Initial Full Load (100M rows)** | 15 – 35 minutes | 25 – 55 minutes | Assumes 10 concurrent table flows |
| **Network Overhead** | Low (if same datacenter/VPC) | Medium–High (cross-platform, potentially cross-network) | Consider dedicated replication VLAN |
| **CPU Overhead on NiFi** | Low (minimal transformation) | Medium (type conversion, schema translation) | Plan for 20–30% more NiFi CPU for MSSQL target |

### 4.3 Operational Complexity

| Operational Concern | Target A: PgSQL → PgSQL | Target B: PgSQL → MS SQL Server |
|--------------------|:-----------------------:|:-------------------------------:|
| **Schema Drift Detection** | Compare `information_schema` on both sides — identical catalog structure | Different catalog structures; requires normalized comparison logic |
| **Schema Migration** | Apply same migration scripts to both schemas | Maintain parallel migration scripts (PgSQL + T-SQL) |
| **Monitoring** | Single JDBC driver, single monitoring profile | Two database platforms to monitor, two sets of metrics |
| **Troubleshooting** | Same query language, same execution plans | Cross-platform debugging; different query plan formats |
| **Backup & Recovery** | Consistent `pg_dump`/`pg_restore` across both | Different backup tools (`pg_dump` vs SSMS/`sqlcmd`) |
| **Team Skillset** | PostgreSQL expertise only | Requires both PostgreSQL and MS SQL Server expertise |

---

## 5. Resource Requirements

### 5.1 Infrastructure

| Component | Target A: PgSQL → PgSQL | Target B: PgSQL → MS SQL Server | Both Targets (Dual Replication) |
|-----------|:-----------------------:|:-------------------------------:|:-------------------------------:|
| **NiFi Cluster** | 3 nodes: 8 vCPU, 32 GB RAM, 500 GB SSD each | 3 nodes: 8 vCPU, 32 GB RAM, 500 GB SSD each | 3 nodes: 12 vCPU, 48 GB RAM, 500 GB SSD each |
| **Source PostgreSQL** | Existing (no additional resources) | Existing (no additional resources) | Existing (add 10–15% CPU headroom for dual extraction) |
| **Target PostgreSQL** | New or existing instance: 8 vCPU, 32 GB RAM, 1 TB storage | N/A | 8 vCPU, 32 GB RAM, 1 TB storage |
| **Target MS SQL Server** | N/A | 8 vCPU, 32 GB RAM, 1 TB storage (Enterprise or Standard edition) | 8 vCPU, 32 GB RAM, 1 TB storage |
| **Network** | Intra-VPC / datacenter LAN | Dedicated VLAN or VPN if cross-network | Dedicated replication subnet |
| **Monitoring Stack** | Prometheus + Grafana (NiFi metrics) | Prometheus + Grafana + SQL Server monitoring | Unified observability layer |

### 5.2 Personnel

| Role | Target A: PgSQL → PgSQL | Target B: PgSQL → MS SQL Server | Both Targets |
|------|:-----------------------:|:-------------------------------:|:------------:|
| **NiFi Developer/Engineer** | 1 FTE (8 weeks build, 0.25 FTE ongoing) | 1 FTE (12 weeks build, 0.25 FTE ongoing) | 1.5 FTE (14 weeks build, 0.5 FTE ongoing) |
| **PostgreSQL DBA** | 0.25 FTE (schema design, tuning) | 0.25 FTE (source-side only) | 0.25 FTE |
| **MS SQL Server DBA** | N/A | 0.5 FTE (target schema, tuning, indexing) | 0.5 FTE |
| **Data Architect** | 0.25 FTE (data model validation) | 0.5 FTE (cross-platform model, type mapping) | 0.5 FTE |
| **DevOps/SRE** | 0.25 FTE (NiFi cluster ops) | 0.25 FTE (NiFi cluster ops) | 0.25 FTE |
| **QA/Data Validation** | 0.25 FTE (reconciliation testing) | 0.5 FTE (cross-platform validation) | 0.5 FTE |
| **Total Build Phase** | **2.0 FTE for 8 weeks** | **2.5 FTE for 12 weeks** | **3.5 FTE for 14 weeks** |
| **Total Ongoing** | **0.75 FTE** | **1.5 FTE** | **2.0 FTE** |

---

## 6. Cost Analysis

### 6.1 Annual Cost Breakdown

| Cost Category | Target A: PgSQL → PgSQL | Target B: PgSQL → MS SQL Server | Both Targets |
|---------------|:-----------------------:|:-------------------------------:|:------------:|
| **Apache NiFi License** | $0 (Open Source) | $0 (Open Source) | $0 |
| **NiFi Cluster Infrastructure** | $36,000 – $72,000 | $36,000 – $72,000 | $48,000 – $96,000 |
| **Target Database Infrastructure** | $18,000 – $36,000 (PgSQL) | $24,000 – $48,000 (MSSQL) | $42,000 – $84,000 |
| **MS SQL Server License** | N/A | $15,000 – $60,000 (per-core licensing) | $15,000 – $60,000 |
| **PostgreSQL License** | $0 (Open Source) | N/A | $0 |
| **Personnel — Build Phase** | $60,000 – $90,000 (one-time) | $100,000 – $150,000 (one-time) | $140,000 – $200,000 (one-time) |
| **Personnel — Ongoing Ops** | $40,000 – $65,000 / year | $80,000 – $130,000 / year | $100,000 – $165,000 / year |
| **Monitoring & Tooling** | $6,000 – $12,000 | $10,000 – $18,000 | $12,000 – $24,000 |
| **Training & Enablement** | $5,000 – $10,000 | $10,000 – $20,000 | $12,000 – $25,000 |

### 6.2 Three-Year Total Cost of Ownership (TCO)

| | Target A: PgSQL → PgSQL | Target B: PgSQL → MS SQL Server | Both Targets |
|--|:-----------------------:|:-------------------------------:|:------------:|
| **Year 1 (Build + Run)** | $165,000 – $285,000 | $275,000 – $498,000 | $369,000 – $654,000 |
| **Year 2 (Run)** | $100,000 – $185,000 | $165,000 – $328,000 | $217,000 – $429,000 |
| **Year 3 (Run)** | $100,000 – $185,000 | $165,000 – $328,000 | $217,000 – $429,000 |
| **3-Year TCO** | **$365,000 – $655,000** | **$605,000 – $1,154,000** | **$803,000 – $1,512,000** |

### 6.3 Cost Differential Analysis

```
3-Year TCO Comparison (Midpoint Values)

Target A (PgSQL → PgSQL)         ████████████████████░░░░░░░░░░░░░░░░░░░░  $510K
Target B (PgSQL → MSSQL)         ██████████████████████████████████░░░░░░░  $880K
Both Targets (Dual Replication)  ████████████████████████████████████████░  $1,158K

$0        $200K      $400K      $600K      $800K      $1.0M      $1.2M
```

**Key Cost Driver:** The MS SQL Server target is **72% more expensive** than the PostgreSQL target over 3 years, primarily due to:
1. SQL Server per-core licensing ($15K–$60K/year)
2. Additional DBA and Data Architect effort for cross-platform type mapping and maintenance
3. Dual-platform operational monitoring burden

---

## 7. Bottleneck Analysis

### 7.1 Target A: PostgreSQL → PostgreSQL — Bottlenecks

| # | Bottleneck | Severity | Impact | Root Cause | Mitigation Strategy |
|---|-----------|----------|--------|------------|-------------------|
| 1 | **Source database load during full extraction** | Medium | Increased query latency on source PgSQL during initial full load or large incremental pulls | NiFi's `ExecuteSQL` runs full table scans on source | Use read replicas for extraction; schedule full loads during off-peak; use `GenerateTableFetch` with partitioned queries |
| 2 | **JDBC fetch size tuning** | Medium | Under-fetching (default 10 rows) causes excessive network roundtrips; over-fetching causes OOM | Default JDBC fetch size is suboptimal for bulk replication | Set `Fetch Size` to 10,000–50,000 in processor config; monitor NiFi heap usage |
| 3 | **Sequence and identity value conflicts** | Medium | Target sequences may collide with source if both schemas are active | Sequences are independent objects; NiFi replicates data but not sequence state | Offset target sequences; or use `setval()` post-replication to sync sequence positions |
| 4 | **Foreign key constraint ordering** | Low | `PutDatabaseRecord` fails if child records arrive before parent records | NiFi processes tables in parallel without dependency awareness | Build a dependency-ordered table list using `pg_catalog.pg_constraint`; disable FK constraints during load, re-enable after |
| 5 | **Large object (BLOB/BYTEA) handling** | Low | Large binary columns cause NiFi content repository pressure and slow throughput | Binary data serialized into Avro increases FlowFile size significantly | Separate BLOB tables into dedicated flows with larger `Content Claim Threshold`; use streaming where possible |

### 7.2 Target B: PostgreSQL → MS SQL Server — Bottlenecks

| # | Bottleneck | Severity | Impact | Root Cause | Mitigation Strategy |
|---|-----------|----------|--------|------------|-------------------|
| 1 | **Data type incompatibility and silent data loss** | **Critical** | PostgreSQL types like `JSONB`, `ARRAY`, `HSTORE`, `INTERVAL` have no direct MSSQL equivalent — incorrect mapping causes data loss or truncation | Fundamental platform mismatch | Implement a comprehensive type-mapping configuration in NiFi; validate with automated reconciliation queries; document accepted fidelity trade-offs |
| 2 | **MSSQL JDBC bulk insert performance** | High | MS SQL JDBC driver's `PutDatabaseRecord` is 30–40% slower than PostgreSQL's optimized COPY protocol | MSSQL JDBC does not support the equivalent of PostgreSQL `COPY FROM STDIN` for bulk loading | Use `useBulkCopyForBatchInsert=true` in MSSQL JDBC connection string (Microsoft JDBC 9.2+); increase batch size to 5,000–10,000 |
| 3 | **Collation and character encoding mismatches** | High | UTF-8 data from PostgreSQL may produce incorrect sort orders or comparison failures in MSSQL if collation is not aligned | MSSQL default collation (`SQL_Latin1_General_CP1_CI_AS`) differs from PostgreSQL (`en_US.UTF-8`) | Set MSSQL database collation to `Latin1_General_100_CI_AS_SC_UTF8` (SQL Server 2019+); validate string comparison behavior |
| 4 | **Schema drift between platforms** | High | Source PgSQL schema evolves (new columns, type changes); target MSSQL schema falls out of sync | No automatic DDL propagation across platforms | Build a NiFi orchestration flow that compares `information_schema` on both sides; generate and execute ALTER statements; alert on breaking changes |
| 5 | **Transaction isolation and lock contention on MSSQL** | Medium | Large batch inserts to MSSQL Datamart cause lock escalation, blocking analytical queries | MSSQL's default locking behavior escalates row locks to table locks at ~5,000 rows | Enable `READ_COMMITTED_SNAPSHOT` on MSSQL Datamart; use `TABLOCK` hint for load operations during maintenance windows; partition target tables |
| 6 | **MSSQL `IDENTITY_INSERT` management** | Medium | Replicating tables with auto-generated IDs requires `SET IDENTITY_INSERT ON`, which can only be active for one table at a time per session | MSSQL restriction on identity insert | Serialize identity-column table loads; or drop IDENTITY property on target and manage keys externally |
| 7 | **Cross-platform timezone handling** | Medium | `TIMESTAMPTZ` in PostgreSQL stores UTC internally; MSSQL `DATETIMEOFFSET` stores the offset explicitly — conversion logic must be precise | Different timezone storage semantics | Standardize on UTC in NiFi transformation layer; use `ConvertRecord` with explicit timezone formatting |
| 8 | **MSSQL tempdb pressure during large loads** | Low | Bulk insert operations and sort operations spill to tempdb, potentially affecting other MSSQL workloads | Shared tempdb resource in MSSQL | Size tempdb appropriately (pre-allocate files); schedule large loads during off-peak; use separate MSSQL instance for Datamart |

### 7.3 Comparative Bottleneck Severity Map

```
                              Target A            Target B
                           (PgSQL → PgSQL)    (PgSQL → MSSQL)
                           ─────────────────   ─────────────────
Data Type Fidelity         ░░░░░░░░░░ LOW      ██████████ CRITICAL
Bulk Load Performance      ░░░░░░░░░░ LOW      ████████░░ HIGH
Schema Drift Mgmt          ░░░░░░░░░░ LOW      ████████░░ HIGH
Collation/Encoding         ░░░░░░░░░░ LOW      ████████░░ HIGH
Source DB Load             ██████░░░░ MEDIUM    ██████░░░░ MEDIUM
JDBC Tuning                ██████░░░░ MEDIUM    ██████░░░░ MEDIUM
FK Ordering                ████░░░░░░ LOW       ████░░░░░░ LOW
Lock Contention            ░░░░░░░░░░ LOW      ██████░░░░ MEDIUM
Timezone Handling          ░░░░░░░░░░ LOW      ██████░░░░ MEDIUM
Identity/Sequence Mgmt     ████░░░░░░ LOW      ██████░░░░ MEDIUM

Total Critical Issues:           0                    1
Total High Issues:               0                    3
Total Medium Issues:             2                    4
```

---

## 8. Data Validation & Reconciliation Design

Data integrity is non-negotiable for enterprise replication. The following automated reconciliation framework runs post-replication:

### 8.1 Reconciliation Checks

| Check | Method | Frequency | Action on Failure |
|-------|--------|-----------|------------------|
| **Row Count Match** | `SELECT COUNT(*) FROM source.table` vs `SELECT COUNT(*) FROM target.table` | Every replication cycle | Alert + auto-retry |
| **Checksum Validation** | `MD5(CONCAT(col1, col2, ...))` on sample rows (1% random sample) | Daily | Alert + flag for investigation |
| **Watermark Integrity** | Verify NiFi state store watermark matches `MAX(updated_at)` on target | Every replication cycle | Reset watermark + full re-extract |
| **Null/Truncation Detection** | Compare `COUNT(*)` where `col IS NOT NULL` on source vs target for known-risk columns | Daily | Alert + targeted re-extract |
| **Schema Parity Check** | Compare column names, types, and nullable attributes between source and target `information_schema` | Weekly (or on deploy) | Alert + generate ALTER script |

### 8.2 Reconciliation Flow in NiFi

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  ExecuteSQL   │     │  ExecuteSQL   │     │  MergeContent │    │  RouteOnAttr  │
│  (Source      │────▶│  (Target      │────▶│  (Compare     │───▶│  (Match /     │
│   COUNT/SUM)  │     │   COUNT/SUM)  │     │   Results)    │    │   Mismatch)   │
└──────────────┘     └──────────────┘     └──────────────┘    └──────┬───────┘
                                                                ┌────┴────┐
                                                                ▼         ▼
                                                           ┌────────┐ ┌────────┐
                                                           │  Log   │ │ Alert  │
                                                           │ Success│ │ + Re-  │
                                                           │        │ │ Extract│
                                                           └────────┘ └────────┘
```

---

## 9. Security Architecture

| Concern | Design Decision |
|---------|----------------|
| **JDBC Credentials** | Stored in NiFi's encrypted `nifi.properties` using AES-256 key; never in flow XML |
| **Network Encryption** | TLS 1.2+ for all JDBC connections (`sslmode=require` for PgSQL, `encrypt=true` for MSSQL) |
| **Authentication** | Service account per target with least-privilege: `SELECT` on source, `INSERT/UPDATE/DELETE/TRUNCATE` on target |
| **NiFi Access Control** | LDAP/Active Directory integration; role-based policies (read-only for operators, edit for engineers) |
| **Data Masking** | Sensitive columns (PII) can be masked in NiFi transformation layer before writing to target |
| **Audit Trail** | NiFi provenance events retained for 30 days; exportable to SIEM for compliance |

---

## 10. Comparative Decision Matrix

### 10.1 Weighted Scoring

Weights reflect enterprise priorities: **Data Fidelity (25%)**, **Performance (20%)**, **Cost (20%)**, **Operational Simplicity (15%)**, **Scalability (10%)**, **Security & Compliance (10%)**.

| Criteria (Weight) | Target A: PgSQL → PgSQL | Target B: PgSQL → MSSQL | Both Targets |
|--------------------|:-----------------------:|:-----------------------:|:------------:|
| Data Fidelity (25%) | 10 | 7 | 7 |
| Performance (20%) | 9 | 7 | 7 |
| Cost Efficiency (20%) | 9 | 6 | 5 |
| Operational Simplicity (15%) | 9 | 5 | 4 |
| Scalability (10%) | 9 | 8 | 8 |
| Security & Compliance (10%) | 9 | 9 | 9 |
| **Weighted Score** | **9.35** | **6.80** | **6.30** |

### 10.2 Decision Summary Table

| Decision Factor | Target A: PgSQL → PgSQL | Target B: PgSQL → MS SQL Server |
|-----------------|:-----------------------:|:-------------------------------:|
| **Best for** | Dev/staging replication, read-replica offloading, cross-domain data sharing | Power BI Datamart, enterprise BI reporting, Microsoft ecosystem integration |
| **3-Year TCO** | $365K – $655K | $605K – $1,154K |
| **Build Timeline** | 8 weeks | 12 weeks |
| **Ongoing FTE** | 0.75 | 1.5 |
| **Critical Bottlenecks** | 0 | 1 (data type fidelity) |
| **Architectural Risk** | Low | Medium |

---

## 11. Recommendation

### If the primary objective is **Power BI MIS Reporting**:

**Recommend Target B (PostgreSQL → MS SQL Server Datamart)** despite higher cost and complexity, because:

1. Power BI's **DirectQuery** and **Import Mode** are optimized for MS SQL Server with native query folding
2. The enterprise BI team likely standardizes on the Microsoft data platform stack
3. The Datamart model (star schema / dimensional model) is best served on MSSQL with columnstore indexes for analytical query performance
4. Investment in MSSQL expertise pays dividends across the broader BI/analytics portfolio

**However**, mitigate the data type fidelity bottleneck by:
- Accepting documented fidelity trade-offs for `JSONB` → `NVARCHAR(MAX)`, `ARRAY` → normalized tables
- Implementing automated reconciliation from Day 1
- Budgeting for the additional DBA and Data Architect capacity

### If the primary objective is **Data Platform Replication**:

**Recommend Target A (PostgreSQL → PostgreSQL)** for its:
- Zero data fidelity loss
- 42% lower 3-year TCO
- Simpler operational model
- Faster time-to-delivery (8 weeks vs 12 weeks)

Then use **Linked Server** or **PolyBase** in SQL Server to expose PostgreSQL data to Power BI if needed.

### Hybrid Approach (Recommended for Maximum Flexibility):

```
┌──────────┐        NiFi        ┌──────────────┐     Power BI
│ Source    │───────────────────▶│ Target PgSQL │◀──── DirectQuery
│ PgSQL    │        │           │ (Full Schema)│      (via connector)
│ Schema   │        │           └──────────────┘
└──────────┘        │
                    │    NiFi    ┌──────────────┐     Power BI
                    └───────────▶│ MSSQL        │◀──── DirectQuery
                     (Subset:    │ Datamart     │      (Optimized)
                      BI-ready   │ (Star Schema)│
                      tables)    └──────────────┘
```

Replicate the **full schema to PostgreSQL** (low cost, full fidelity), and replicate only the **BI-relevant subset as a star schema to MS SQL Server** (optimized for Power BI). This minimizes the cross-platform type mapping surface area while delivering optimal BI performance.

---

## 12. Implementation Roadmap

| Phase | Duration | Target A Activities | Target B Activities |
|-------|----------|-------------------|-------------------|
| **Phase 1: Foundation** | Weeks 1–2 | NiFi cluster setup, PgSQL connectivity, schema discovery flow | NiFi cluster setup, MSSQL connectivity, type mapping configuration |
| **Phase 2: DDL Sync** | Weeks 3–4 | Automated DDL replication flow (CREATE TABLE, constraints) | DDL translation engine (PgSQL DDL → MSSQL DDL with type mapping) |
| **Phase 3: Full Load** | Weeks 5–6 | Full load flows for all tables with FK ordering | Full load flows with bulk copy optimization and identity management |
| **Phase 4: Incremental** | Weeks 7–8 | Watermark-based incremental flows; state management | Watermark-based incremental flows; collation and timezone validation |
| **Phase 5: Resilience** | Weeks 9–10 | Retry, DLQ, backpressure tuning | Retry, DLQ, lock contention mitigation, tempdb sizing |
| **Phase 6: Validation** | Weeks 11–12 | Reconciliation flows, monitoring dashboards | Cross-platform reconciliation, schema drift detection |
| **Phase 7: Go-Live** | Weeks 13–14 | Production cutover, runbook handover | Production cutover, Power BI Datamart connectivity validation |

---

## 13. Decision Required

The leadership team is requested to:

1. **Select the replication target strategy:**
   - [ ] Target A only: PostgreSQL → PostgreSQL
   - [ ] Target B only: PostgreSQL → MS SQL Server Datamart
   - [ ] Hybrid approach (Recommended): Full schema to PgSQL + BI subset to MSSQL Datamart

2. **Authorize budget allocation:**
   - Target A: $165K–$285K (Year 1)
   - Target B: $275K–$498K (Year 1)
   - Hybrid: $369K–$654K (Year 1)

3. **Confirm personnel allocation:** 2.0–3.5 FTE depending on selected approach

4. **Approve implementation timeline:** 8–14 weeks depending on selected approach

5. **Accept documented trade-offs** for cross-platform type mapping (Target B) or authorize additional investigation time

---

## Appendix A: NiFi Processor Reference

| Processor | Role in This Design | Configuration Notes |
|-----------|-------------------|-------------------|
| `ListDatabaseTables` | Schema discovery — enumerates all tables in source schema | Set `Schema Name` to source schema; `Catalog` to database name |
| `GenerateTableFetch` | Watermark-based incremental query generation | Set `Maximum-value Columns` to timestamp/ID column; `Partition Size` for parallel fetching |
| `ExecuteSQL` | Execute extraction queries and DDL statements | Set `Max Rows Per Flow File` to 100,000 for batching; tune `Fetch Size` to 10,000+ |
| `ConvertRecord` | Schema transformation, format conversion (Avro ↔ JSON) | Use `AvroReader` + `AvroRecordSetWriter` for PgSQL target; JSON for debugging |
| `UpdateAttribute` | Route FlowFiles to correct target, set metadata | Add `target.type`, `target.table`, `target.schema` attributes |
| `PutDatabaseRecord` | Write records to target database | Set `Statement Type` to INSERT or UPSERT; tune `Batch Size` to 5,000–10,000 |
| `RouteOnAttribute` | Conditional routing (PgSQL vs MSSQL target) | Route on `${target.type:equals('mssql')}` |
| `RetryFlowFile` | Retry failed FlowFiles with exponential backoff | Set `Maximum Retries` to 3; `Retry Attribute` for tracking |
| `PutFile` | Dead-letter queue for unprocessable records | Write to monitored DLQ directory with timestamp partitioning |

## Appendix B: JDBC Connection String Templates

**PostgreSQL Source/Target:**
```
jdbc:postgresql://<host>:5432/<database>?currentSchema=<schema>&sslmode=require&reWriteBatchedInserts=true
```

**MS SQL Server Target:**
```
jdbc:sqlserver://<host>:1433;databaseName=<database>;encrypt=true;trustServerCertificate=false;useBulkCopyForBatchInsert=true
```

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **Datamart** | A subject-oriented subset of a data warehouse, optimized for a specific business function (e.g., MIS reporting) |
| **CDC** | Change Data Capture — a pattern for identifying and capturing changes to source data |
| **Watermark** | A persistent checkpoint (e.g., max timestamp or ID) used to track incremental extraction progress |
| **DDL** | Data Definition Language — SQL statements for creating and altering schema objects (CREATE, ALTER, DROP) |
| **Star Schema** | A dimensional modeling technique with a central fact table and surrounding dimension tables |
| **DirectQuery** | Power BI connectivity mode that queries the source database live without importing data |
| **DLQ** | Dead-Letter Queue — a holding area for records that could not be processed after all retry attempts |
| **FlowFile** | NiFi's core data abstraction — a pointer to content plus a set of key-value attributes |
| **Provenance** | NiFi's built-in audit trail recording the full lifecycle of every FlowFile |

---

*This document is prepared for internal decision-making purposes. Cost estimates are indicative and should be validated with vendor quotes, infrastructure team assessments, and licensing agreements. Performance figures are based on industry benchmarks and should be confirmed via proof-of-concept testing with representative data volumes.*

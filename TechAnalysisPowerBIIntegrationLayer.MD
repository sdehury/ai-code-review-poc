# Technical Analysis: PowerBI MIS Integration Layer — Architecture Decision Record

**Document Classification:** Internal — Leadership Decision Brief
**Version:** 1.0
**Date:** March 29, 2026
**Prepared by:** Enterprise Architecture & Technology Office
**Audience:** CTO, VP Engineering, Director of Data Engineering, IT Leadership

---

## 1. Executive Summary

The enterprise requires a scalable, production-grade integration layer to source **event-driven data from Apache Kafka topics** into **Microsoft SQL Server**, which will serve as the analytical data store for **Power BI MIS Reports and Dashboards**.

The Architecture Review Board has determined that building a custom microservice to accumulate Kafka stream data, perform ETL, and write directly to SQL Server constitutes an **integration anti-pattern**. This approach introduces tight coupling, undifferentiated operational burden, poor fault tolerance, and violates the principle of separation of concerns between stream processing and data integration.

This document evaluates **four candidate integration technologies** against enterprise requirements and provides a data-driven recommendation for leadership decision-making.

---

## 2. Problem Statement & Architectural Constraint

### Current State
```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐     ┌────────────┐
│  Event Source │────▶│  Apache Kafka    │────▶│   MS SQL      │────▶│  Power BI  │
│  (Producers) │     │  (Topics/Streams)│     │   Server      │     │  Dashboards│
└──────────────┘     └──────────────────┘     └──────────────┘     └────────────┘
                              │
                              ▼
                     ┌────────────────────┐
                     │   INTEGRATION GAP  │
                     │   (This Analysis)  │
                     └────────────────────┘
```

### Why a Custom Microservice is an Anti-Pattern

| Concern | Risk |
|---------|------|
| **Tight Coupling** | A single microservice performing consume → transform → load creates a monolithic integration point that violates the decoupled architecture Kafka was chosen to enable |
| **No Backpressure Management** | Custom code lacks built-in mechanisms for handling consumer lag, replay, and offset management at enterprise scale |
| **Operational Overhead** | The team must build, test, and maintain dead-letter queues, retry logic, schema evolution handling, monitoring, and alerting from scratch |
| **No Lineage or Auditability** | Regulators and data governance teams cannot trace data transformations without purpose-built tooling |
| **Single Point of Failure** | One deployment unit owns the entire pipeline — a bug in transformation logic can halt ingestion entirely |
| **Reinventing the Wheel** | Enterprise-grade integration platforms solve these exact problems with battle-tested, vendor-supported capabilities |

---

## 3. Candidate Solutions Overview

| # | Solution | Category | Vendor / License |
|---|----------|----------|-----------------|
| 1 | **Apache NiFi** | Open-source data integration & dataflow automation | Apache 2.0 (Open Source) |
| 2 | **SQL Server Integration Services (SSIS)** | Microsoft-native ETL platform | Licensed with SQL Server Enterprise/Standard |
| 3 | **Alteryx** | Low-code data analytics & integration platform | Commercial (Subscription) |
| 4 | **Power BI REST API (Direct API Layer)** | API-first ingestion via custom service layer | Microsoft (included with Power BI Premium) |

---

## 4. Detailed Technical Evaluation

### 4.1 Apache NiFi

**Architecture Pattern:** Kafka Consumer → NiFi Flow (Transform) → JDBC/ODBC Writer → MS SQL Server

```
┌─────────┐    ConsumeKafka     ┌───────────────┐   PutDatabaseRecord   ┌──────────┐
│  Kafka   │───────────────────▶│  Apache NiFi  │──────────────────────▶│  MS SQL   │
│  Topics  │   (Native Proc.)   │  Flow Engine  │    (JDBC Sink)        │  Server   │
└─────────┘                     └───────────────┘                       └──────────┘
                                  │ Transform    │
                                  │ Route        │
                                  │ Enrich       │
                                  │ Validate     │
```

**Capabilities:**

| Dimension | Assessment |
|-----------|-----------|
| Kafka Integration | Native `ConsumeKafka` and `ConsumeKafkaRecord` processors with offset management, consumer group support, and schema registry integration |
| SQL Server Integration | `PutDatabaseRecord`, `PutSQL`, `ExecuteSQL` processors with connection pooling and batch writes |
| Transformation | Built-in Record-level transforms, Avro/JSON/CSV schema handling, JOLTTransformJSON, UpdateRecord, QueryRecord (SQL-on-flow) |
| Backpressure | Native backpressure mechanism with configurable queue thresholds — prevents downstream overload |
| Fault Tolerance | Guaranteed delivery with provenance tracking; content repository ensures zero data loss on failure |
| Scalability | NiFi Cluster mode supports horizontal scaling; can process millions of events/hour |
| Data Lineage | Full provenance tracking — every event's origin, transformation, and destination is recorded |
| Monitoring | Built-in web UI with real-time flow metrics, bulletin board for errors, and REST API for external monitoring integration |

**Resource Requirements:**

| Resource | Specification |
|----------|--------------|
| Infrastructure | 3-node NiFi cluster (minimum for HA): 8 vCPU, 32 GB RAM, 500 GB SSD per node |
| Personnel | 1–2 Data Engineers with NiFi experience (or 4–6 weeks ramp-up for existing Kafka/ETL engineers) |
| Deployment | On-premises VM / Kubernetes (Docker images available) / Cloud IaaS |
| Ongoing Ops | 0.5 FTE for monitoring, flow updates, and cluster management |

**Cost Estimate (Annual):**

| Item | Cost (USD) |
|------|-----------|
| Software License | **$0** (Apache 2.0 Open Source) |
| Infrastructure (3-node cluster on-prem or cloud) | $36,000 – $72,000 |
| Personnel (ramp-up + ongoing) | $40,000 – $80,000 (partial FTE allocation) |
| **Total Year 1** | **$76,000 – $152,000** |
| **Total Year 2+** | **$56,000 – $112,000** |

**Bottlenecks & Risks:**

| Bottleneck | Severity | Mitigation |
|------------|----------|------------|
| Java heap pressure under high-throughput Kafka consumption | Medium | Tune JVM settings; use Record-oriented processors to reduce object churn |
| NiFi's content repository I/O can become a bottleneck at very high volumes (>500K events/sec) | Medium | Use SSDs; configure content repository across multiple disks |
| Operational learning curve — NiFi's flow-based paradigm differs from traditional ETL | Medium | Invest in training; leverage large community and documentation |
| No native CDC (Change Data Capture) — schema evolution requires manual flow updates | Low | Integrate with Confluent Schema Registry for automatic schema handling |
| Cluster coordination via ZooKeeper (legacy) or NiFi native clustering adds operational complexity | Low | Use NiFi 2.x which removes ZooKeeper dependency |

---

### 4.2 SQL Server Integration Services (SSIS)

**Architecture Pattern:** Kafka → Custom Script Task / Kafka Connect → Staging Table → SSIS Package (Transform & Load) → MS SQL Server

```
┌─────────┐   Kafka Connect /    ┌──────────────┐   SSIS Package    ┌──────────┐
│  Kafka   │───Script Task──────▶│  Staging Area │─────────────────▶│  MS SQL   │
│  Topics  │   (Workaround)      │  (SQL Table)  │  (Transform/Load)│  Server   │
└─────────┘                      └──────────────┘                   └──────────┘
```

**Capabilities:**

| Dimension | Assessment |
|-----------|-----------|
| Kafka Integration | **No native Kafka connector.** Requires either: (a) Kafka Connect JDBC Sink to land data into a staging table, or (b) custom C#/Script Task using a Kafka client library — both add architectural complexity |
| SQL Server Integration | Excellent — SSIS is purpose-built for SQL Server with optimized bulk insert, OLE DB destinations, and native data type handling |
| Transformation | Robust transformation engine: Derived Columns, Lookup, Merge Join, Slowly Changing Dimension, Data Conversion, and Conditional Split |
| Backpressure | Not applicable — SSIS operates in batch mode; does not consume streams in real-time |
| Fault Tolerance | Package-level checkpoints and transaction support; restart from point of failure |
| Scalability | Vertical scaling only; limited parallelism within a single package execution |
| Data Lineage | Basic lineage via SSISDB catalog; limited compared to purpose-built lineage tools |
| Monitoring | SQL Server Agent for scheduling; SSISDB execution reports; Integration Services Dashboard |

**Resource Requirements:**

| Resource | Specification |
|----------|--------------|
| Infrastructure | SQL Server instance with Integration Services installed; additional staging database capacity |
| Personnel | 1–2 SQL/SSIS developers (typically available in Microsoft-oriented teams) |
| Deployment | SQL Server on-premises or Azure SQL Managed Instance with SSIS IR (Integration Runtime) |
| Ongoing Ops | 0.25–0.5 FTE for package maintenance, scheduling, and monitoring |

**Cost Estimate (Annual):**

| Item | Cost (USD) |
|------|-----------|
| Software License | Included with SQL Server Enterprise license (if already licensed); ~$15,000/core if new licensing required |
| Additional SQL Server capacity for staging | $12,000 – $30,000 |
| Kafka Connect infrastructure (if used for bridging) | $6,000 – $18,000 |
| Personnel | $30,000 – $60,000 (partial FTE, leveraging existing SQL talent) |
| **Total Year 1** | **$48,000 – $123,000** |
| **Total Year 2+** | **$42,000 – $90,000** |

**Bottlenecks & Risks:**

| Bottleneck | Severity | Mitigation |
|------------|----------|------------|
| **No native Kafka support — this is the critical gap.** SSIS cannot natively consume from Kafka topics, requiring an intermediary landing zone | **High** | Use Kafka Connect JDBC Sink Connector to bridge Kafka → staging table → SSIS |
| Batch-only execution model introduces **data latency** (minimum 1–5 minute intervals realistically) | High | Acceptable only if near-real-time is not a requirement; not suitable for live dashboards |
| SSIS is a **legacy platform** — Microsoft is investing in Azure Data Factory (ADF), not SSIS | High | Consider Azure Data Factory with SSIS Integration Runtime for cloud-forward strategy |
| Vertical scaling ceiling — single-server execution limits throughput | Medium | Partition workloads across multiple packages; use SQL Server Scale-Out feature |
| Schema evolution in Kafka topics requires manual SSIS package updates and redeployment | Medium | Implement schema versioning strategy; automate package generation if feasible |
| Staging table approach doubles storage requirements and introduces an additional failure point | Medium | Use truncate-and-load pattern; monitor staging table growth |

---

### 4.3 Alteryx

**Architecture Pattern:** Kafka → Alteryx Input Tool (via API/ODBC) → Alteryx Workflow (Transform) → MS SQL Server Output

```
┌─────────┐   Kafka REST Proxy /  ┌───────────────┐   Output Data    ┌──────────┐
│  Kafka   │───ODBC Connector────▶│   Alteryx     │────────────────▶│  MS SQL   │
│  Topics  │   (Limited)          │   Designer +  │   (ODBC/OLE DB)  │  Server   │
│          │                      │   Server      │                  │          │
└─────────┘                       └───────────────┘                  └──────────┘
```

**Capabilities:**

| Dimension | Assessment |
|-----------|-----------|
| Kafka Integration | **Limited.** No native Kafka consumer. Requires Kafka REST Proxy or a custom Python/SDK tool within Alteryx. This is a significant architectural workaround |
| SQL Server Integration | Strong — native Output Data tool with ODBC/OLE DB support; In-Database processing for SQL Server |
| Transformation | Excellent for analysts — drag-and-drop transformation, spatial analytics, predictive tools, and regex parsing |
| Backpressure | Not applicable — Alteryx operates in batch/scheduled mode |
| Fault Tolerance | Workflow-level error handling; limited compared to streaming platforms |
| Scalability | Alteryx Server provides multi-worker execution; horizontal scaling through worker nodes |
| Data Lineage | Workflow-level lineage; no event-level provenance tracking |
| Monitoring | Alteryx Server Gallery with scheduling, execution history, and notification support |

**Resource Requirements:**

| Resource | Specification |
|----------|--------------|
| Infrastructure | Alteryx Server: 8+ vCPU, 32 GB RAM, dedicated storage; Worker nodes for parallel execution |
| Personnel | 1 Alteryx Developer/Analyst (Alteryx skills are niche; may require hiring or training) |
| Deployment | On-premises Windows Server or Alteryx Analytics Cloud |
| Ongoing Ops | 0.25–0.5 FTE for workflow management and server administration |

**Cost Estimate (Annual):**

| Item | Cost (USD) |
|------|-----------|
| Alteryx Designer License (per user) | $5,195/user |
| Alteryx Server License | **$58,500 – $115,000** (varies by tier and worker count) |
| Kafka REST Proxy infrastructure | $6,000 – $12,000 |
| Infrastructure (server hardware/cloud) | $18,000 – $36,000 |
| Personnel (specialized Alteryx talent) | $40,000 – $80,000 |
| **Total Year 1** | **$127,695 – $248,195** |
| **Total Year 2+** | **$109,695 – $225,000** |

**Bottlenecks & Risks:**

| Bottleneck | Severity | Mitigation |
|------------|----------|------------|
| **No native Kafka consumer — requires REST Proxy or custom connector, making this architecturally misaligned** | **Critical** | Kafka REST Proxy adds latency and another component to manage; not a production-grade streaming integration |
| **Highest cost option** — Alteryx Server licensing is substantial for an integration-only use case | **High** | Justifiable only if Alteryx is already adopted enterprise-wide for analytics workloads |
| Batch processing model — not designed for streaming or near-real-time ingestion | High | Minimum scheduling interval of 1 minute; not suitable for low-latency requirements |
| Alteryx talent is scarce in the market compared to SQL/Java/Python engineers | Medium | Training existing staff takes 2–4 weeks for basic workflows; advanced Kafka integration requires deeper expertise |
| Vendor lock-in — proprietary workflow format with no portability | Medium | Accept the lock-in if Alteryx provides value across multiple use cases beyond this integration |
| Alteryx is optimized for **analytics workloads**, not **high-volume data integration pipelines** — using it purely as an ETL tool underutilizes the platform and overpays for the capability | Medium | Only select if broader analytics use cases justify the investment |

---

### 4.4 Power BI REST API (Direct API Ingestion)

**Architecture Pattern:** Kafka → Custom API Service (Consume + Transform) → Power BI Push Dataset API / Streaming Dataset API

```
┌─────────┐    Kafka Consumer    ┌──────────────────┐   Push/Streaming   ┌────────────┐
│  Kafka   │────────────────────▶│  Custom API      │──────────────────▶│  Power BI  │
│  Topics  │    (App Code)       │  Service Layer   │   Dataset API      │  Service   │
└─────────┘                      └──────────────────┘                    └────────────┘
                                   (Transform here)       ▲
                                                          │
                                              Bypasses MS SQL Server
```

**Capabilities:**

| Dimension | Assessment |
|-----------|-----------|
| Kafka Integration | Via custom application code (same anti-pattern concern raised by Architecture Review Board) |
| SQL Server Integration | **Bypasses SQL Server entirely** — data goes directly to Power BI datasets |
| Transformation | Must be coded in the custom service layer — no declarative transformation engine |
| Backpressure | Must be custom-built; Power BI API has rate limits (120 requests/minute for push datasets) |
| Fault Tolerance | Must be custom-built; no built-in retry, dead-letter, or replay mechanisms |
| Scalability | Constrained by Power BI API rate limits and dataset size limits (1M rows/hour for push datasets) |
| Data Lineage | None — no built-in provenance or lineage tracking |
| Monitoring | Power BI usage metrics + custom application monitoring |

**Resource Requirements:**

| Resource | Specification |
|----------|--------------|
| Infrastructure | Application hosting (2–4 vCPU, 8–16 GB RAM); message queue for buffering |
| Personnel | 2–3 Full-stack developers with Kafka + Power BI API expertise |
| Deployment | Kubernetes / App Service / Container instance |
| Ongoing Ops | 0.5–1 FTE for API service maintenance, rate limit management, and schema updates |

**Cost Estimate (Annual):**

| Item | Cost (USD) |
|------|-----------|
| Software License | Included with Power BI Premium ($4,995/month per capacity = ~$60,000/year) |
| Application infrastructure | $12,000 – $24,000 |
| Personnel (development + maintenance) | $80,000 – $150,000 (higher due to custom code burden) |
| **Total Year 1** | **$152,000 – $234,000** |
| **Total Year 2+** | **$92,000 – $174,000** |

**Bottlenecks & Risks:**

| Bottleneck | Severity | Mitigation |
|------------|----------|------------|
| **Recreates the same anti-pattern** the Architecture Review Board rejected — a custom service consuming Kafka, transforming, and pushing to a target | **Critical** | This approach directly contradicts the architectural guidance; selecting it requires ARB exception approval |
| **Power BI API rate limits** — Push datasets: 120 requests/min, 1M rows/hour; Streaming datasets: 5 requests/sec, 200K rows/hour | **Critical** | Insufficient for high-volume enterprise event streams; requires aggressive batching and buffering |
| **No SQL Server persistence** — data exists only in Power BI datasets; no ability to run ad-hoc SQL queries, join with other enterprise data, or serve other consumers | **High** | If other teams or systems need this data, a separate integration must be built — defeating the purpose |
| Push datasets have a **1 GB size limit** and limited retention — not suitable for historical MIS reporting | High | Hybrid approach required: SQL Server for historical + API for real-time — doubles the architecture |
| Full custom development burden — every capability (retry, DLQ, monitoring, schema evolution) must be hand-built | High | Increases time-to-delivery by 3–6 months compared to platform-based approaches |
| Power BI Premium licensing is a prerequisite — significant cost if not already in place | Medium | May already be licensed; verify with Microsoft licensing team |

---

## 5. Comparative Analysis Matrix

### 5.1 Feature Comparison

| Criteria | Apache NiFi | SSIS | Alteryx | Power BI API |
|----------|:-----------:|:----:|:-------:|:------------:|
| Native Kafka Consumer | Yes | No | No | Custom Code |
| Native SQL Server Writer | Yes | Yes (Excellent) | Yes | N/A (Bypasses) |
| Real-time / Near-Real-Time | Yes | No (Batch) | No (Batch) | Yes (with limits) |
| Built-in Backpressure | Yes | N/A | N/A | No |
| Data Lineage & Provenance | Excellent | Basic | Basic | None |
| Fault Tolerance | Excellent | Good | Fair | Custom-built |
| Horizontal Scalability | Yes (Cluster) | No | Limited | Custom-built |
| Schema Evolution Support | Good | Poor | Poor | Custom-built |
| Operational Complexity | Medium | Low | Low | High |
| Vendor Lock-in Risk | None (Open Source) | Medium (Microsoft) | High (Proprietary) | Medium (Microsoft) |

### 5.2 Cost Comparison (3-Year TCO)

| Solution | Year 1 | Year 2 | Year 3 | **3-Year TCO** |
|----------|--------|--------|--------|----------------|
| **Apache NiFi** | $76K – $152K | $56K – $112K | $56K – $112K | **$188K – $376K** |
| **SSIS** | $48K – $123K | $42K – $90K | $42K – $90K | **$132K – $303K** |
| **Alteryx** | $128K – $248K | $110K – $225K | $110K – $225K | **$348K – $698K** |
| **Power BI API** | $152K – $234K | $92K – $174K | $92K – $174K | **$336K – $582K** |

### 5.3 Risk Heat Map

| Risk Category | Apache NiFi | SSIS | Alteryx | Power BI API |
|---------------|:-----------:|:----:|:-------:|:------------:|
| Kafka Integration Gap | LOW | HIGH | CRITICAL | CRITICAL |
| Architectural Anti-Pattern | LOW | MEDIUM | MEDIUM | CRITICAL |
| Data Latency | LOW | HIGH | HIGH | MEDIUM |
| Throughput Ceiling | LOW | MEDIUM | HIGH | CRITICAL |
| Operational Burden | MEDIUM | LOW | LOW | HIGH |
| Vendor/Platform Risk | LOW | MEDIUM | HIGH | MEDIUM |
| Talent Availability | MEDIUM | LOW | HIGH | MEDIUM |
| Future Scalability | LOW | HIGH | MEDIUM | HIGH |

---

## 6. Scoring Summary (Weighted)

Weights reflect enterprise priorities: **Architectural Fitness (25%)**, **Kafka Integration (20%)**, **Scalability & Performance (15%)**, **Cost (15%)**, **Operational Maturity (10%)**, **Talent Availability (10%)**, **Future-Proofing (5%)**.

| Criteria (Weight) | Apache NiFi | SSIS | Alteryx | Power BI API |
|--------------------|:-----------:|:----:|:-------:|:------------:|
| Architectural Fitness (25%) | 9 | 6 | 5 | 3 |
| Kafka Integration (20%) | 10 | 4 | 3 | 5 |
| Scalability & Performance (15%) | 9 | 5 | 5 | 4 |
| Cost Efficiency (15%) | 8 | 9 | 4 | 5 |
| Operational Maturity (10%) | 8 | 8 | 7 | 4 |
| Talent Availability (10%) | 6 | 9 | 4 | 6 |
| Future-Proofing (5%) | 9 | 4 | 6 | 5 |
| **Weighted Score** | **8.65** | **6.15** | **4.55** | **4.30** |

---

## 7. Recommendation

### Primary Recommendation: Apache NiFi

Apache NiFi is the **strongest architectural fit** for this integration pattern. It is the only solution that provides:

1. **Native, production-grade Kafka consumption** — no intermediary staging or bridging required
2. **Built-in backpressure and guaranteed delivery** — critical for enterprise event stream processing
3. **Full data provenance** — meets governance and audit requirements out of the box
4. **Horizontal scalability** — NiFi clusters can scale to meet growing event volumes
5. **Zero licensing cost** — total cost of ownership is infrastructure and personnel only
6. **No anti-pattern violation** — NiFi is a purpose-built integration platform, not a custom microservice

### Secondary Recommendation: SSIS (Conditional)

SSIS is a viable option **only if** the following conditions are all true:
- Near-real-time ingestion is **not** required (batch latency of 5+ minutes is acceptable)
- The organization already has **SQL Server Enterprise licensing** and **SSIS expertise**
- Kafka Connect JDBC Sink is deployed to bridge Kafka → staging tables
- The Architecture Review Board approves the two-hop pattern (Kafka → Kafka Connect → Staging → SSIS → SQL Server)

### Not Recommended

| Solution | Reason |
|----------|--------|
| **Alteryx** | Architecturally misaligned — no native Kafka support, highest cost, and optimized for analytics rather than data integration pipelines. Only justifiable if Alteryx is already an enterprise standard for broader analytics use cases. |
| **Power BI API** | Directly contradicts the Architecture Review Board's anti-pattern ruling. Bypasses SQL Server (losing queryability for other consumers), has critical rate limits, and shifts the full engineering burden to custom code. |

---

## 8. Proposed Target Architecture (Apache NiFi)

```
┌──────────────┐                                                          ┌────────────────┐
│  Event Source │                                                          │   Power BI     │
│  (Producers) │                                                          │   Service      │
└──────┬───────┘                                                          └───────▲────────┘
       │                                                                          │
       ▼                                                                          │ DirectQuery /
┌──────────────┐     ConsumeKafkaRecord     ┌───────────────┐                     │ Import Mode
│  Apache      │───────────────────────────▶│  Apache NiFi  │                     │
│  Kafka       │   (Consumer Group,         │  Cluster      │              ┌──────┴────────┐
│  Cluster     │    Offset Mgmt,            │               │              │   MS SQL       │
│              │    Schema Registry)        │  ┌──────────┐ │              │   Server       │
│  ┌────────┐  │                            │  │Transform │ │              │                │
│  │Topic A │  │                            │  │  Route   │ │  PutDatabase │  ┌──────────┐  │
│  │Topic B │  │                            │  │  Enrich  │─┼─────────────▶│  │ Fact     │  │
│  │Topic C │  │                            │  │  Validate│ │  Record      │  │ Tables   │  │
│  └────────┘  │                            │  └──────────┘ │  (JDBC,      │  │ Dim      │  │
└──────────────┘                            │               │   Batch,     │  │ Tables   │  │
                                            │  ┌──────────┐ │   Pooled)    │  └──────────┘  │
                                            │  │Provenance│ │              └───────────────┘
                                            │  │Tracking  │ │
                                            │  │Monitoring│ │
                                            │  └──────────┘ │
                                            └───────────────┘
```

---

## 9. Implementation Roadmap (Apache NiFi)

| Phase | Duration | Activities | Deliverables |
|-------|----------|-----------|--------------|
| **Phase 1: Foundation** | Weeks 1–3 | NiFi cluster provisioning, Kafka connectivity validation, SQL Server schema design | Infrastructure ready, connectivity proven |
| **Phase 2: Core Flows** | Weeks 4–7 | Build NiFi flows for each Kafka topic, implement transformations, configure SQL Server destinations | Working pipeline for all topics |
| **Phase 3: Resilience** | Weeks 8–9 | Dead-letter routing, error handling, backpressure tuning, provenance configuration | Production-grade fault tolerance |
| **Phase 4: Observability** | Weeks 10–11 | Monitoring dashboards, alerting integration, SLA validation, performance benchmarking | Operational readiness |
| **Phase 5: Go-Live** | Week 12 | Production cutover, runbook handover, Power BI dataset connectivity | Production launch |

---

## 10. Decision Required

The leadership team is requested to:

1. **Approve the recommended solution** (Apache NiFi) or select an alternative with documented rationale
2. **Authorize budget allocation** for infrastructure provisioning and personnel (estimated $76K–$152K Year 1)
3. **Confirm timeline** for the 12-week implementation roadmap
4. **Assign sponsorship** for the Architecture Review Board alignment and procurement process

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Kafka** | Distributed event streaming platform for high-throughput, fault-tolerant message processing |
| **ETL** | Extract, Transform, Load — the process of moving data between systems with transformation |
| **SSIS** | SQL Server Integration Services — Microsoft's ETL platform bundled with SQL Server |
| **NiFi** | Apache NiFi — open-source dataflow automation platform for routing and transforming data |
| **Backpressure** | A flow-control mechanism that prevents downstream systems from being overwhelmed |
| **Data Provenance** | The ability to trace the origin, movement, and transformation of every data element |
| **Anti-Pattern** | A common solution that appears effective but is counterproductive in practice |
| **MIS** | Management Information System — structured reporting for operational decision-making |
| **DirectQuery** | Power BI connectivity mode that queries the source database in real-time |
| **Push Dataset** | Power BI dataset type that receives data via REST API calls |

## Appendix B: Reference Architecture Standards

- **Integration Pattern:** Enterprise Integration Patterns (Hohpe & Woolf) — Message Translator, Content-Based Router
- **Data Architecture:** TOGAF Data Architecture principles — Single Source of Truth, Data Governance
- **Event-Driven Architecture:** Confluent Reference Architecture for Kafka-centric enterprises
- **Microsoft Data Platform:** Azure Well-Architected Framework — Data Engineering pillar

---

*This document is prepared for internal decision-making purposes. Cost estimates are indicative and should be validated with vendor quotes and infrastructure team assessments.*

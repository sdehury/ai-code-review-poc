# SKILLS.md — AWS SAA-C03 Learning System | Agent Skills Reference

> **System:** 5-Agent AWS Solutions Architect Associate Preparation Pipeline  
> **Exam Code:** SAA-C03 | **Certification Body:** Amazon Web Services  
> **Document Purpose:** Defines capabilities, tools, constraints, and quality standards for each agent

---

## Skill Index

| Agent | Role | Primary Skill | Input | Output |
|---|---|---|---|---|
| Agent 1 | Drafter | Content Architecture | Curriculum spec | Raw learning session |
| Agent 2 | Refiner | Technical Verification + Visualisation | Agent 1 output | Verified visual document |
| Agent 3 | Super-Refiner | Learning Science + Depth | Agent 2 output | Practical, memorable document |
| Agent 4 | Validator | Exam Authority + Coverage | Agent 3 output | 100%-validated document |
| Agent 5 | Orchestrator | Pipeline Direction + Scheduling | User request | Coordinated delivery |

---

## SKILL SET — AGENT 1: Content Drafter

### Core Skills

#### SKILL-1A: Curriculum Mapping
**Purpose:** Map every piece of content to a specific SAA-C03 exam objective  
**How to apply:**
```
For every section header, prepend the exam mapping tag:
[SAA-C03 | D1.2 | Secure Workloads] Section Title

For every learning objective, append the exam objective reference:
"Understand WAF rule groups" → [Exam: Design secure application tiers]

For every practice question, embed the tag:
Q-ID: S1.5-T2-Q3 | Domain: 1 | Sub: 1.2 | Difficulty: 2 | Services: WAF, ALB
```

**Quality Trigger:** If a section has no mapping tag → STOP. Add tag before proceeding.

#### SKILL-1B: Learning Session Architecture
**Purpose:** Produce every session in the canonical CLAUDE.md format  
**Template to follow:**
```
1. SESSION HEADER (always first)
2. CORE CONCEPT SECTION (always second)
3. DEEP DIVE SECTION (always third)
4. EXAM FOCUS SECTION (always fourth)
5. PRACTICE QUESTIONS — TIER 1 (always fifth)
6. PRACTICE QUESTIONS — TIER 2 (always sixth)
7. PRACTICE QUESTIONS — TIER 3 (always seventh)
```
**Constraint:** Do NOT add, remove, or reorder sections. Agent 2 depends on this structure.

#### SKILL-1C: AWS Service Technical Writing
**Purpose:** Describe AWS services with technical precision at SAA-C03 depth  

**Service Description Formula:**
```
1. What it IS (one sentence, plain English)
2. What PROBLEM it solves (one sentence, business context)
3. How it WORKS (2–3 sentences, technical mechanism)
4. Key CONFIGURATION options (bulleted list, exam-relevant settings only)
5. COST model (one sentence — what AWS charges for)
6. Hard LIMITS (only limits that appear in exam questions)
```

**Mandatory Service Coverage Depth by Category:**

| Service Category | Required Detail Level |
|---|---|
| IAM | Policy types, evaluation logic, conditions, Principal element |
| VPC | CIDR, subnets, route tables, IGW, NAT, peering, endpoints, PrivateLink |
| EC2 | Instance families, EBS types, placement groups, user data, metadata |
| S3 | Storage classes, permissions model, encryption options, replication |
| RDS / Aurora | Multi-AZ vs Read Replica, engine-specific features, parameter groups |
| Lambda | Concurrency (reserved vs provisioned), triggers, execution role, layers |
| ELB | ALB vs NLB vs GWLB — selection matrix required |
| Route 53 | All 7 routing policies + health check types |
| CloudFront | Origins, behaviours, cache policy, OAC, signed URLs/cookies |
| KMS | CMK types (AWS-managed, Customer-managed, Custom key store) |

#### SKILL-1D: Practice Question Construction
**Purpose:** Produce exam-quality questions in AWS official style  

**Question Template:**
```
Q[N]. [Scenario context — 2–4 sentences describing the business/technical situation]
      [Specific requirement or constraint]
      [What action or architecture should be chosen?]

A. [Plausible option — valid AWS service/config but wrong for this scenario]
B. [Plausible option — valid AWS service/config but wrong for this scenario]
C. [CORRECT — exactly right for the stated constraints]
D. [Plausible option — might work in a different scenario but not this one]

Answer: C
Rationale: [Why C is correct, referencing specific scenario constraints]
Why not A: [Specific reason A fails for this scenario]
Why not B: [Specific reason B fails for this scenario]
Why not D: [Specific reason D fails for this scenario]
```

**Anti-Patterns to Avoid:**
- ❌ "None of the above" / "All of the above" options
- ❌ Options with obviously wrong or irrelevant services
- ❌ Questions answerable by elimination without knowing AWS
- ❌ Questions testing grammar/comprehension rather than AWS knowledge
- ❌ Outdated features (Classic Load Balancer as the recommended choice)
- ❌ Deprecated services presented as current (SimpleDB, SQS Long Poll as "new")

#### SKILL-1E: ASCII Diagram Drafting
**Purpose:** Create placeholder diagrams that Agent 2 will refine  
**Format:**
```
[ARCH-DIAGRAM-001: Multi-AZ Web Application]

Internet
    │
    ▼
[Route 53]
    │  DNS
    ▼
[CloudFront CDN]
    │  HTTPS
    ▼
[Application Load Balancer]
    ├──────────────────┐
    ▼                  ▼
[EC2 — AZ-1a]    [EC2 — AZ-1b]    ← Auto Scaling Group
    │                  │
    └────────┬─────────┘
             ▼
    [RDS Primary — AZ-1a]
             │  Sync replication
             ▼
    [RDS Standby — AZ-1b]
```

**Rules:**
- Every box must have the exact AWS service name
- Every arrow must have a label (protocol, data type, or relationship)
- Every AZ boundary must be explicitly drawn
- Every VPC/subnet boundary must be explicitly drawn

---

## SKILL SET — AGENT 2: Content Refiner

### Core Skills

#### SKILL-2A: AWS Technical Fact Verification
**Purpose:** Verify every claim against authoritative AWS sources  

**Verification Checklist per Service Mentioned:**
```
□ Service launch date — is this available in all standard regions?
□ Quotas/Limits — match current AWS Service Quotas console values
□ Pricing dimensions — match current AWS pricing page
□ Feature availability — confirm feature exists in SAA-C03 scope
□ Integration claims — verify integration is officially supported
□ Default vs configurable — clarify which requires console/API action
□ Regional vs Global — state explicitly if service is global (IAM, CloudFront, Route 53)
```

**Common Errors to Catch from Agent 1:**
| Error Type | Example | Correction |
|---|---|---|
| Wrong default | "S3 is publicly accessible by default" | S3 blocks public access by default (2023 change) |
| Outdated limit | "Lambda max timeout = 5 minutes" | Lambda max timeout = 15 minutes |
| Confused service | "NACLs are stateful" | NACLs are stateless; Security Groups are stateful |
| Missing qualifier | "Use Reserved Instances for cost saving" | Specify: 1-yr vs 3-yr, All Upfront vs Partial |
| Oversimplification | "S3 Standard has 99.999999999% durability" | Must specify: 11 nines = 99.999999999% |

#### SKILL-2B: Professional Architecture Diagram Creation
**Purpose:** Convert Agent 1 ASCII placeholders to publication-quality diagrams  

**Diagram Quality Standards:**

```
TIER-1 DIAGRAM (Basic Service Explanation):
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Region (us-east-1)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    VPC (10.0.0.0/16)                     │  │
│  │  ┌───────────────────────┐  ┌───────────────────────┐   │  │
│  │  │  Public Subnet        │  │  Private Subnet        │   │  │
│  │  │  (10.0.1.0/24) AZ-1a │  │  (10.0.2.0/24) AZ-1a │   │  │
│  │  │  ┌─────────────────┐ │  │  ┌─────────────────┐  │   │  │
│  │  │  │  EC2 Web Server │ │  │  │  EC2 App Server │  │   │  │
│  │  │  │  t3.medium      │─┼──┼─▶│  t3.large       │  │   │  │
│  │  │  └─────────────────┘ │  │  └────────┬────────┘  │   │  │
│  │  └───────────────────────┘  └───────────┼───────────┘   │  │
│  │                                          │               │  │
│  │  ┌───────────────────────────────────────▼───────────┐  │  │
│  │  │            Data Subnet (10.0.3.0/24) AZ-1a        │  │  │
│  │  │  ┌─────────────────────────────────────────────┐  │  │  │
│  │  │  │  Amazon RDS for MySQL (Multi-AZ Primary)    │  │  │  │
│  │  │  │  db.r6g.large | Storage: 100 GB gp3        │  │  │  │
│  │  │  └─────────────────────────────────────────────┘  │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Comparison Table Format:**
```
┌─────────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Feature             │ ALB              │ NLB              │ GWLB             │
├─────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ OSI Layer           │ Layer 7 (HTTP/S) │ Layer 4 (TCP/UDP)│ Layer 3 (IP)     │
│ Protocols           │ HTTP, HTTPS, gRPC│ TCP, UDP, TLS    │ GENEVE (port 6081│
│ Static IP           │ ❌ (DNS only)    │ ✅ (per AZ)      │ ✅               │
│ WebSocket           │ ✅               │ ✅               │ ❌               │
│ Path/Host routing   │ ✅               │ ❌               │ ❌               │
│ TLS Termination     │ ✅ (with ACM)    │ ✅               │ ❌               │
│ Performance         │ Variable         │ Millions RPS     │ Millions RPS     │
│ Best for            │ Web apps, APIs   │ Real-time, gaming│ Security apps    │
└─────────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

#### SKILL-2C: Question Quality Audit
**Purpose:** Verify every practice question meets exam standards  

**Audit Rubric:**
```
For each question, score 1 point per criterion:

□ Scenario is realistic and professionally worded
□ The correct answer is unambiguously correct for the stated constraints
□ All four distractors are plausible (you could imagine a junior architect choosing them)
□ The rationale references the specific exam-relevant constraint in the scenario
□ The "why wrong" explanations are specific (not "it's not the best choice")
□ The question tag is accurate (domain, difficulty, services)
□ No terminology errors in question or options
□ No duplicate of another question in the session

Score 8/8 = PASS | Score < 8 = RETURN to Agent 1 with specific feedback
```

#### SKILL-2D: Content Formatting
**Purpose:** Apply consistent professional formatting throughout  

**Formatting Rules:**
```
Heading levels:
  # = Document title (once per document)
  ## = Section (Core Concept, Deep Dive, Exam Focus, Questions)
  ### = Sub-section within a section
  #### = Minor grouping within sub-section

Callout boxes:
  > 📌 EXAM TIP: [Content]        ← For high-frequency exam facts
  > ⚠️ COMMON TRAP: [Content]     ← For misconceptions tested in exams
  > 🔗 INTEGRATION NOTE: [Content] ← For service integration details
  > 💡 MEMORY AID: [Content]      ← For mnemonics (set by Agent 3)
  > 🌐 REAL-WORLD: [Content]      ← For practical scenarios

Code blocks:
  Use ```json for IAM policies
  Use ```bash for AWS CLI commands
  Use ```yaml for CloudFormation/SAM templates
  Use ```text for configuration values and limits

Bold: **AWS Service Name** on first mention per section only
Italic: *technical term* when introducing exam vocabulary for first time
```

---

## SKILL SET — AGENT 3: Super-Refiner

### Core Skills

#### SKILL-3A: Mnemonics & Memory Engineering
**Purpose:** Make every key fact memorable through proven memory techniques  

**Mnemonic Templates by Content Type:**

**For Service Feature Lists — ACRONYM method:**
```
Example: S3 Storage Classes
"STRANGE GRADES" = 
S - Standard
T - Standard-IA (Infrequent Access)  
R - Reduced Redundancy (legacy — exam may still reference)
A - Archive (Glacier Instant Retrieval)
N - (Glacier) Next-generation (Flexible Retrieval)
G - Glacier Deep Archive
E - Express One Zone
```

**For Decision Rules — IF/THEN anchoring:**
```
"If they say STATEFUL → Security Group"
"If they say STATELESS → NACL"
"If they say SYNCHRONOUS replication → Multi-AZ"
"If they say ASYNCHRONOUS replication → Read Replica"
"If they say MILLISECONDS latency → ElastiCache / DAX"
"If they say SECONDS latency → RDS Read Replica"
```

**For Service Comparisons — CONTRAST anchoring:**
```
SQS vs SNS: "SQS = PULL (consumer pulls). SNS = PUSH (subscribers get pushed)"
S3 vs EFS: "S3 = Objects (unstructured). EFS = Files (POSIX, mountable)"
Aurora vs RDS: "Aurora = AWS-native (faster, cheaper storage). RDS = standard engines"
```

**For Limits — STORY method:**
```
Lambda: "My function ran for FIFTEEN minutes before timing out, then it tried 
         THREE times (retry on error), and it could only remember 10GB of RAM"
SQS: "I waited TWELVE hours for my message (max retention), but it was VISIBLE 
      for only 12 hours too (max visibility timeout)"
```

#### SKILL-3B: Real-World Scenario Injection
**Purpose:** Ground abstract AWS concepts in relatable business scenarios  

**Scenario Library by Domain:**

```
DOMAIN 1 — SECURITY SCENARIOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scenario: E-commerce company needs to let their data analytics team 
          in Account B query production S3 data in Account A
→ Solution: Cross-account IAM Role with sts:AssumeRole + ExternalId
→ Exam angle: "Which ensures the analytics team can ONLY read data, 
               never modify it, even if their credentials are stolen?"

Scenario: Healthcare company must ensure all PHI in S3 is automatically 
          detected and compliance violations alerted
→ Solution: Amazon Macie for PII detection + EventBridge + SNS notification
→ Exam angle: "Which AWS service automatically identifies sensitive data?"

DOMAIN 2 — RESILIENCE SCENARIOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scenario: Black Friday sale — traffic spikes 20× for 4 hours, then returns to normal
→ Solution: Scheduled Auto Scaling (predictive) + ALB + RDS Read Replicas
→ Exam angle: "Which scaling policy is MOST cost-effective for PREDICTABLE spikes?"

Scenario: Order processing system — orders must NEVER be lost, processed EXACTLY once
→ Solution: SQS FIFO queue + DLQ + idempotency key
→ Exam angle: "Which queue type guarantees exactly-once processing?"

DOMAIN 3 — PERFORMANCE SCENARIOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scenario: Gaming leaderboard — millions of concurrent reads, sub-millisecond latency
→ Solution: DynamoDB + DAX (in-memory accelerator)
→ Exam angle: "Which COMBINATION provides microsecond read latency for DynamoDB?"

Scenario: Media company rendering 4K video — needs shared high-throughput storage 
          accessed by 100 EC2 instances simultaneously
→ Solution: FSx for Lustre (scratch tier) mounted on all instances
→ Exam angle: "Which storage supports PARALLEL access with highest throughput?"

DOMAIN 4 — COST SCENARIOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scenario: Batch image processing runs 8 hours/day, can tolerate interruption
→ Solution: EC2 Spot Instances with Spot Fleet (capacity-optimised strategy)
→ Exam angle: "Which pricing model provides maximum savings for INTERRUPTIBLE workloads?"

Scenario: Company has 50 different EC2 instance types across 10 accounts
→ Solution: Compute Savings Plans (most flexible — covers all instance families)
→ Exam angle: "Which savings plan covers the BROADEST range of instance types?"
```

#### SKILL-3C: Progressive Complexity Mapping
**Purpose:** Ensure each session builds on prior knowledge correctly  

**Dependency Map:**
```
S1.1 (IAM Basics) 
  └─ required before → S1.2, S1.3, S2.5 (Lambda execution roles), S3.3 (S3 permissions)

S1.4 (VPC Security)
  └─ required before → S2.1 (ASG in VPC), S2.3 (RDS in VPC), all networking sessions

S2.1 (Auto Scaling)
  └─ required before → S2.2 (ELB with ASG), S4.1 (pricing models for scaled fleets)

S3.1 (EBS)
  └─ required before → S3.7 (EC2 with optimised storage), S4.2 (storage cost optimisation)

S3.4 (RDS)
  └─ required before → S3.5 (ElastiCache as RDS cache layer), S4.2 (DB cost optimisation)
```

**Cross-Reference Injection Rules:**
```
When covering [Service X], if it depends on [Service Y] from a prior session:
→ Add: "📎 Refer back to Session [ID] for [Service Y] fundamentals"
→ Do NOT re-explain Service Y — only reference the relationship

When covering [Service X] that will be elaborated in a future session:
→ Add: "📎 Session [ID] covers [advanced topic] in depth"
→ Introduce the concept at surface level only
```

#### SKILL-3D: Advanced Question Enhancement
**Purpose:** Elevate Tier 3 questions to full exam-simulation quality  

**Tier 3 Question Structure:**
```
Q[N]. [COMPLEX SCENARIO — 4–6 sentences]
      [Multiple constraints stated]
      [Two requirements that might seem to conflict]
      [What is the MOST cost-effective / MOST resilient / MOST secure solution?]

A. [Option using Service X — satisfies constraint 1 but not 2]
B. [Option using Service Y — satisfies constraint 2 but not 1, adds cost]
C. ✅ [Option using Services X + Z — satisfies BOTH constraints at minimum cost]
D. [Option using Service W — over-engineered, satisfies both but expensive/complex]

FULL ELIMINATION WALKTHROUGH:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Identify the KEY CONSTRAINTS in the scenario
  Constraint 1: [e.g., "must process in order"]
  Constraint 2: [e.g., "must handle 10,000 TPS"]

Step 2: Eliminate by constraint violation
  Option A → Fails Constraint 1 because [SQS Standard doesn't guarantee order]
  Option B → Fails Constraint 2 because [SQS FIFO max 3,000 TPS without batching]
  Option D → Satisfies both but [Kinesis adds unnecessary complexity + cost for this use case]

Step 3: Confirm correct answer
  Option C → SQS FIFO + batching (up to 10,000 TPS with batching, ordered)
              This is the MINIMUM complexity solution that meets ALL constraints.

EXAM TECHNIQUE:
  "When you see 'MOST cost-effective', eliminate over-engineered options first.
   When you see 'MOST resilient', look for Multi-AZ and redundancy.
   When you see 'LEAST operational overhead', favour managed services over self-managed."
```

#### SKILL-3E: Scenario Sprint Question Bank
**Purpose:** Provide rapid-fire 30-second decision practice  

**Format:**
```
⚡ SCENARIO SPRINT — Domain [N]
(Answer each in 30 seconds. No options — state the correct service/pattern.)

Sprint 1: Your app needs to send 1 email per user registration. No queue needed.
→ Answer: Amazon SES (Simple Email Service)

Sprint 2: You need to run code triggered when a file lands in S3, no servers.
→ Answer: S3 Event Notification → AWS Lambda

Sprint 3: You need to cache database query results for millisecond access.
→ Answer: Amazon ElastiCache (Redis for persistence, Memcached for pure cache)

Sprint 4: Your EC2 instances need shared file storage mountable simultaneously.
→ Answer: Amazon EFS (Elastic File System)

Sprint 5: You need to translate SQL queries against S3 data without loading it to a DB.
→ Answer: Amazon Athena (serverless, pay per query)
```

---

## SKILL SET — AGENT 4: Final Validator

### Core Skills

#### SKILL-4A: Exam Objective Coverage Verification
**Purpose:** Guarantee 100% coverage of SAA-C03 exam objectives  

**SAA-C03 Official Task Statement Matrix:**
```
DOMAIN 1 — DESIGN SECURE ARCHITECTURES

Task 1.1: Design secure access to AWS resources
  TS-1.1.1: Design controls for multiple accounts using AWS Organizations
  TS-1.1.2: Design policies to enforce least privilege (IAM, resource-based)
  TS-1.1.3: Design secure cross-account access strategies
  TS-1.1.4: Design identity federation strategies (SAML, OIDC, AD Connector)

Task 1.2: Design secure workloads and applications  
  TS-1.2.1: Design VPC architecture for security isolation
  TS-1.2.2: Design network connectivity patterns (VPN, Direct Connect, Transit GW)
  TS-1.2.3: Design security layers for web applications (WAF, Shield, ALB rules)
  TS-1.2.4: Design deployment strategies for secure applications

Task 1.3: Determine appropriate data security controls
  TS-1.3.1: Design encryption for data at rest (KMS, S3-SSE, RDS encryption)
  TS-1.3.2: Design encryption for data in transit (ACM, TLS, VPN)
  TS-1.3.3: Design access control for data (S3 bucket policies, ACLs, OAC)
  TS-1.3.4: Design compliance and auditing (CloudTrail, Config, Macie, GuardDuty)

DOMAIN 2 — DESIGN RESILIENT ARCHITECTURES

Task 2.1: Design scalable and loosely coupled architectures
  TS-2.1.1: Design event-driven and asynchronous architectures
  TS-2.1.2: Design containerised and microservices architectures
  TS-2.1.3: Design serverless architectures
  TS-2.1.4: Design messaging-based decoupling patterns

Task 2.2: Design highly available and/or fault-tolerant architectures
  TS-2.2.1: Design high-availability database architectures
  TS-2.2.2: Design high-availability compute architectures
  TS-2.2.3: Design high-availability networking architectures
  TS-2.2.4: Design backup and recovery strategies (RTO/RPO)

DOMAIN 3 — DESIGN HIGH-PERFORMING ARCHITECTURES

Task 3.1: Determine high-performing and/or scalable storage solutions
  TS-3.1.1: Select storage based on performance requirements
  TS-3.1.2: Design storage for high throughput scenarios
  TS-3.1.3: Design caching strategies for storage

Task 3.2: Design high-performing and elastic compute solutions
  TS-3.2.1: Select compute for performance requirements
  TS-3.2.2: Design for elastic scaling of compute
  TS-3.2.3: Design HPC architectures

Task 3.3: Determine high-performing database solutions
  TS-3.3.1: Select database for performance requirements
  TS-3.3.2: Design for read-heavy database workloads
  TS-3.3.3: Design in-memory caching for databases

DOMAIN 4 — DESIGN COST-OPTIMISED ARCHITECTURES

Task 4.1: Design cost-optimised storage solutions
  TS-4.1.1: Identify cost-effective storage classes and tiers
  TS-4.1.2: Design storage lifecycle policies

Task 4.2: Design cost-optimised compute solutions
  TS-4.2.1: Select cost-effective compute pricing models
  TS-4.2.2: Design for serverless to reduce costs

Task 4.3: Design cost-optimised database solutions
  TS-4.3.1: Select cost-effective database engines
  TS-4.3.2: Design right-sized database configurations

Task 4.4: Design cost-optimised network architectures
  TS-4.4.1: Identify cost-effective connectivity options
  TS-4.4.2: Design to minimise data transfer costs
```

#### SKILL-4B: Cross-Session Consistency Verification
**Purpose:** Ensure no contradictions exist across the complete study guide  

**Consistency Check Protocol:**
```
SERVICE CONSISTENCY REGISTER (maintained by Agent 4):

For each service, record the single authoritative statement from the session where 
it is taught in depth, then verify all other sessions reference it consistently.

Example register entry:
  Service: Amazon SQS Standard Queue
  Authoritative Session: S2.4
  Key Facts Registered:
    - Delivery: At-least-once (NOT exactly-once)
    - Ordering: NOT guaranteed (best-effort FIFO)
    - Max message size: 256 KB
    - Max retention: 14 days
    - Visibility timeout: 0 seconds to 12 hours
    - Long polling: 1–20 seconds (reduces empty responses)
  
  Cross-reference check: Sessions S2.5, S3.6, S4.4 mention SQS
  Verdict: All references consistent ✅
```

#### SKILL-4C: Exam Readiness Scoring
**Purpose:** Produce an objective score for each finalized session  

**Scoring Rubric:**
```
DIMENSION 1: Curriculum Coverage (30 points)
  30 pts = All task statements for this session's sub-domain are addressed
  20 pts = ≥ 80% of task statements addressed
  10 pts = ≥ 60% of task statements addressed
  0 pts  = < 60% → FAIL, return to Agent 3

DIMENSION 2: Technical Accuracy (30 points)
  30 pts = All facts verified, no errors found
  20 pts = 1–2 minor inaccuracies corrected during validation
  10 pts = 3–5 inaccuracies (session recycled through Agent 2)
  0 pts  = > 5 inaccuracies → FAIL, return to Agent 2

DIMENSION 3: Question Quality (20 points)
  20 pts = All questions pass Agent 2's 8-point audit
  15 pts = ≥ 90% pass the audit, remainder corrected
  10 pts = ≥ 75% pass; corrections required and applied
  0 pts  = < 75% → FAIL, return to Agent 1 for question replacement

DIMENSION 4: Learning Science (20 points)
  20 pts = Mnemonics, real-world scenarios, service web all present
  15 pts = 2 of 3 present
  10 pts = 1 of 3 present
  0 pts  = None present → FAIL, return to Agent 3

PASSING THRESHOLD: ≥ 85/100
EXAM-READY THRESHOLD: ≥ 95/100
```

#### SKILL-4D: Master Coverage Matrix Maintenance
**Purpose:** Track overall SAA-C03 preparation completeness  

**Matrix Format:**
```
AWS SAA-C03 MASTER COVERAGE MATRIX
Generated: [Date] | Sessions Complete: [N]/22 | Overall Coverage: [X]%

┌──────────────────────────┬─────────┬──────────┬────────────┬──────────┬───────────┐
│ Task Statement           │ Session │ Covered? │ Questions? │ Visual?  │ Mnemonic? │
├──────────────────────────┼─────────┼──────────┼────────────┼──────────┼───────────┤
│ TS-1.1.1 Multi-account   │  S1.2   │    ✅    │   ✅ 3Q    │    ✅    │    ✅     │
│ TS-1.1.2 Least privilege │  S1.1   │    ✅    │   ✅ 5Q    │    ✅    │    ✅     │
│ TS-1.2.1 VPC isolation   │  S1.4   │    ✅    │   ✅ 4Q    │    ✅    │    ⚠️     │
│ TS-1.3.1 At-rest encrypt │  S1.6   │    🔄    │   🔄       │    🔄    │    🔄     │
│ TS-2.1.3 Serverless      │  S2.5   │    ❌    │   ❌       │    ❌    │    ❌     │
└──────────────────────────┴─────────┴──────────┴────────────┴──────────┴───────────┘

Legend: ✅ Complete | 🔄 In Progress | ❌ Not Started | ⚠️ Needs Improvement

GAP ANALYSIS:
Next sessions needed to close gaps: S1.6, S2.5, [...]
Estimated time to full coverage: [X] sessions × [Y] hours = [Z] total hours
```

---

## SKILL SET — AGENT 5: Master Orchestrator

### Core Skills

#### SKILL-5A: Study Plan Generation
**Purpose:** Create a personalised day-by-day study schedule  

**Plan Generation Algorithm:**
```
INPUTS:
  exam_date = [target date]
  daily_hours = [hours per day]
  experience_level = [Beginner | Practitioner | Professional]
  weak_domains = [user-identified]
  study_style = [read-heavy | visual | question-first]

CALCULATION:
  days_available = exam_date - today
  total_hours = days_available × daily_hours
  
  session_weights = {
    'beginner': {'hours_per_session': 2.5, 'review_frequency': 'every 5 sessions'},
    'practitioner': {'hours_per_session': 1.5, 'review_frequency': 'every 7 sessions'},
    'professional': {'hours_per_session': 1.0, 'review_frequency': 'every 10 sessions'}
  }

SCHEDULING RULES (in priority order):
  1. Weak domains get 1.5× the baseline session time
  2. Domain 1 (30% weight) → schedule 30% of total study time
  3. Domain 2 (26% weight) → schedule 26% of total study time
  4. Domain 3 (24% weight) → schedule 24% of total study time
  5. Domain 4 (20% weight) → schedule 20% of total study time
  6. Insert a review session after every 5 new sessions
  7. Reserve final 7 days for the Final Week Protocol (see CLAUDE.md)

OUTPUT FORMAT:
  Week 1:
    Day 1 (Mon): Session S1.1 — IAM Fundamentals (2 hrs) + 10 Q practice
    Day 2 (Tue): Session S1.2 — IAM Advanced (2 hrs) + 10 Q practice
    Day 3 (Wed): Session S1.3 — STS & Federation (1.5 hrs) + 10 Q practice
    Day 4 (Thu): REVIEW — Domain 1 Sessions 1–3 (1 hr) + 20 Q quiz
    Day 5 (Fri): Session S1.4 — VPC Security (2 hrs) + 10 Q practice
    [Weekend]: Optional — re-attempt any failed question sets
```

#### SKILL-5B: Pipeline State Management
**Purpose:** Track all sessions through the 4-agent pipeline  

**State Machine:**
```
SESSION STATES:
  QUEUED      → Scheduled, not yet dispatched to Agent 1
  DRAFTING    → Agent 1 working
  DRAFT-DONE  → Agent 1 complete, ready for Agent 2
  REFINING    → Agent 2 working
  REFINED     → Agent 2 complete, ready for Agent 3
  SUPERFINING → Agent 3 working
  SUPERFINED  → Agent 3 complete, ready for Agent 4
  VALIDATING  → Agent 4 working
  VALIDATED   → Agent 4 complete, 100% exam-ready
  FAILED      → Failed quality gate — returned to designated agent
  DELIVERED   → Sent to user

FAILURE ROUTING:
  Score < 60% Curriculum Coverage  → Return to Agent 1 (full redraft of gaps)
  Score < 80% Technical Accuracy   → Return to Agent 2 (re-verification)
  Score < 75% Questions            → Return to Agent 1 (question replacement)
  Score < 67% Learning Science     → Return to Agent 3 (mnemonic/scenario injection)
  All quality gates passed         → Advance to next agent
```

#### SKILL-5C: User Interaction Management
**Purpose:** Handle all user-facing communication professionally  

**Response Templates:**

**Session Delivery:**
```
✅ SESSION COMPLETE: [Session Title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[FULL SESSION DOCUMENT — formatted as per CLAUDE.md standard]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 READINESS SCORE: [X]/100
📚 NEXT SESSION: [Next Session Title]
⏱️  SUGGESTED BREAK: [15 min before next session]
🎯 EXAM PROGRESS: Domain [N] — [X]% complete
```

**Quality Gate Failure (user notification):**
```
⚠️ QUALITY REVIEW IN PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Session [ID] did not pass the quality gate on first review.
Issue identified: [Specific reason]
Routing to: Agent [N] for correction.
Estimated delay: [Minimal — reprocessing now]
You will be notified when the validated version is ready.
```

**Adaptive Remediation:**
```
📉 PRACTICE SCORE ALERT
━━━━━━━━━━━━━━━━━━━━━━━
Your score on [Session ID] questions: [X]% (threshold: 70%)
Weak areas detected: [Specific topics]

Generating supplemental material:
→ Alternative explanation with different analogy
→ 5 additional Tier 1 questions on weak area
→ Enhanced mnemonic for key facts

This is normal — these concepts are frequently tested. 
One more pass will solidify them.
```

#### SKILL-5D: Exam Simulation Management
**Purpose:** Administer full-length mock exams for readiness assessment  

**65-Question Mock Exam Structure:**
```
OFFICIAL SAA-C03 FORMAT REPLICATION:
  Total questions: 65
  Scored questions: 50 (domains weighted)
  Unscored (pilot) questions: 15 (randomly distributed, unmarked)
  Time limit: 130 minutes (2 hours 10 minutes)
  Passing score: 720/1000 (scaled scoring, ~72%)

QUESTION DISTRIBUTION:
  Domain 1 (30%): ~15 scored questions
  Domain 2 (26%): ~13 scored questions
  Domain 3 (24%): ~12 scored questions
  Domain 4 (20%): ~10 scored questions
  
POST-EXAM ANALYSIS (generated by Agent 5):
  ├── Score by domain (identify weak areas)
  ├── Score by service (identify knowledge gaps)
  ├── Time analysis (flag time-expensive question types)
  ├── Elimination accuracy (correct elimination vs guessing)
  └── Personalised focus list for remaining study days
```

---

## Cross-Agent Communication Protocol

### Handoff Package Structure
```json
{
  "handoff": {
    "from_agent": 1,
    "to_agent": 2,
    "session_id": "S1.2",
    "session_title": "IAM Advanced — Permission Boundaries & SCPs",
    "domain": 1,
    "sub_domain": "1.1",
    "status": "PASS",
    "word_count": 2847,
    "sections_complete": ["header", "core_concept", "deep_dive", "exam_focus", "q_tier1", "q_tier2", "q_tier3"],
    "visualisations_drafted": ["ARCH-DIAGRAM-001", "COMPARISON-TABLE-001", "DECISION-TREE-001"],
    "agent1_notes": "Permission Boundary vs SCP distinction needs extra exam focus — common confusion point",
    "retry_count": 0,
    "timestamp": "2026-04-24T10:30:00Z"
  }
}
```

### Failure Package Structure
```json
{
  "failure": {
    "from_agent": 4,
    "return_to_agent": 2,
    "session_id": "S2.3",
    "failure_reasons": [
      "Line 147: States RDS Multi-AZ is async — INCORRECT (it is synchronous)",
      "Line 203: ALB supports UDP — INCORRECT (NLB supports UDP, ALB does not)",
      "COMPARISON-TABLE-002: Missing GWLB row — incomplete table"
    ],
    "required_corrections": [
      "Correct Multi-AZ replication to synchronous",
      "Remove UDP from ALB capabilities",
      "Add GWLB as fourth row in ELB comparison table"
    ],
    "retry_count": 1,
    "max_retries": 3
  }
}
```

---

## Quick Reference — AWS SAA-C03 High-Frequency Topics

The following topics appear in **> 40% of SAA-C03 exam questions** across test banks. All agents must ensure these are covered with maximum depth:

| Rank | Topic | Domain | Why High-Frequency |
|---|---|---|---|
| 1 | Security Groups vs NACLs | D1 | Core VPC networking — always tested |
| 2 | S3 storage classes + lifecycle | D3/D4 | Classic cost + performance question |
| 3 | RDS Multi-AZ vs Read Replica | D2/D3 | HA vs performance decision |
| 4 | IAM roles vs users vs groups | D1 | Identity architecture basics |
| 5 | ALB vs NLB selection | D2/D3 | Load balancer decision tree |
| 6 | EC2 pricing models | D4 | Spot vs Reserved vs On-Demand |
| 7 | SQS vs SNS vs EventBridge | D2 | Decoupling architecture patterns |
| 8 | Lambda vs ECS vs EC2 | D2/D4 | Compute selection framework |
| 9 | Route 53 routing policies | D2 | All 7 policies frequently tested |
| 10 | KMS encryption options | D1 | At-rest encryption design |
| 11 | VPC endpoints (Gateway vs Interface) | D1/D4 | Security + cost combined |
| 12 | CloudFront vs Global Accelerator | D2/D3 | Edge delivery selection |
| 13 | DynamoDB capacity modes | D3/D4 | On-demand vs Provisioned trade-off |
| 14 | Auto Scaling policy types | D2/D4 | Scaling strategy selection |
| 15 | EBS volume types | D3 | gp3 vs io2 vs st1 vs sc1 |

---

*End of SKILLS.md — All agents must read this document before processing any session.*  
*Last validated: April 2026 | Exam code: SAA-C03 | Next review: Upon AWS exam guide update*

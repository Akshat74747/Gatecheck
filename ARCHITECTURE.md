# Gatecheck — Architecture

This document covers the system design, data flows, and component relationships for Gatecheck.

---

## Contents

1. [System Overview](#1-system-overview)
2. [Webhook Ingestion](#2-webhook-ingestion)
3. [PR Review Pipeline](#3-pr-review-pipeline)
4. [Push Scan Pipeline](#4-push-scan-pipeline)
5. [CI Halt Gate](#5-ci-halt-gate)
6. [Stale Job Recovery](#6-stale-job-recovery)
7. [Database Schema](#7-database-schema)
8. [Component Map](#8-component-map)

---

## 1. System Overview

Gatecheck is a fully serverless application. There is no long-running server, no message broker, and no separate worker process. Aurora DSQL acts as both the relational store and the job queue. Vercel Cron fires a lightweight worker function every minute that claims the next pending job and executes it.

```mermaid
graph LR
    subgraph External
        GH[GitHub App]
        CI[GitHub Actions]
        Dev[Developer]
    end

    subgraph Vercel
        Webhook[Webhook Handler]
        Cron[Cron Worker\nevery 60s]
        API[REST API\nNext.js Route Handlers]
    end

    subgraph AWS
        DSQL[(Aurora DSQL)]
    end

    subgraph Google
        Gemini[Gemini 2.5 Flash]
    end

    GH -->|push / pull_request| Webhook
    Webhook --> DSQL
    Cron -->|claim job| DSQL
    Cron -->|parallel agent calls| Gemini
    Cron -->|write results| DSQL
    CI -->|halt decision query| API
    Dev -->|dashboard| API
    API <--> DSQL
```

**Why Aurora DSQL as a job queue?**

Aurora DSQL is serverless and PostgreSQL-compatible, which means it can be used for both structured data queries and optimistic-locking job claiming without a separate broker. Vercel Cron invokes the worker once per minute; the worker claims up to 5 jobs per invocation with a two-step SELECT + UPDATE to avoid double-processing.

---

## 2. Webhook Ingestion

Every push and pull request event from an enrolled repository is received at `POST /api/webhook`. The handler verifies the HMAC-SHA256 signature, routes the event by type, and enqueues a scan job.

```mermaid
flowchart TD
    GH[GitHub App] -->|POST /api/webhook| WH[Webhook Handler]
    WH --> Sig{Valid HMAC\nsignature?}
    Sig -->|No| Reject[401 Rejected]
    Sig -->|Yes| Route{Event type?}

    Route -->|push| PushCheck{Enrolled repo?}
    Route -->|pull_request\nopened / synchronize| PRCheck{Enrolled repo?}
    Route -->|installation| Install[Upsert repo record]
    Route -->|other| Ignore[Ignored]

    PushCheck -->|No| Ignore
    PushCheck -->|Yes| PushJob[Create push_scan job\nin scan_jobs]

    PRCheck -->|No| Ignore
    PRCheck -->|Yes| PRJob[Create pr_scan job\nin scan_jobs]

    PushJob --> DSQL[(Aurora DSQL)]
    PRJob --> DSQL
    Install --> DSQL
```

**Key constraints applied here:**

- Repos that are not marked `is_security_enrolled = true` are silently skipped — no job created
- Job records store `repo_id`, `commit_sha`, `pr_number`, and `job_type`; the actual diff is fetched at execution time to avoid storing large payloads in the queue
- Each job starts with `status = 'pending'` and `attempts = 0`; `max_attempts = 3`

---

## 3. PR Review Pipeline

When the cron worker claims a `pr_scan` job, it runs the full 6-agent review pipeline and writes results back to Aurora DSQL.

```mermaid
flowchart TD
    Cron[Cron Worker] --> Claim[Claim next pending job]
    Claim -->|No jobs| Exit[Return — nothing to do]
    Claim -->|pr_scan job| Auth[Get GitHub installation token\nRS256 JWT → access token]

    Auth --> Fetch[Fetch PR diff + metadata\nfrom GitHub API]
    Fetch --> Upsert[Upsert pull_request record]
    Upsert --> Review[Create pr_review record\nstatus = running]

    Review --> Parallel

    subgraph Parallel ["Promise.all — 6 agents in parallel"]
        S[Security Agent\nOWASP Top 10, secrets, auth]
        B[Bugs Agent\nLogic, null refs, edge cases]
        P[Performance Agent\nN+1, blocking I/O]
        R[Readability Agent\nNaming, complexity]
        BP[Best Practices Agent\nPatterns, error handling]
        D[Documentation Agent\nDocs, comments, contracts]
    end

    Parallel -->|Each agent writes agent_report| Reports[(agent_reports)]

    Reports --> Synth[Synthesizer\ncap top 25 findings\n25s timeout with fallback]

    Synth --> UpdateReview[Update pr_review\nverdict + confidence_score\ntop_actions + summary]
    UpdateReview --> UpdatePR[Update pull_request\nstatus = reviewed]
    UpdatePR --> Complete[Complete scan_job]
```

**Agent implementation:**

Each of the six agents calls `callGeminiJSON()` with the PR diff and a domain-specific system prompt. The response schema is:

```ts
{
  summary: string                  // 2–3 sentence overview
  findings: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
    category: string               // short label e.g. "SQL Injection"
    message: string                // clear description
    file: string                   // path in the repo
    line: number                   // line number in the diff
    suggestion: string             // how to fix it
  }>
}
```

**Synthesizer design:**

The synthesizer receives all agent outputs and:
1. Caps the findings list (top 8 critical/high + top 5 medium) to keep the prompt small
2. Truncates each agent summary to 120 characters
3. Races Gemini against a 25-second timeout
4. Falls back to a code-generated verdict if Gemini doesn't respond in time — the verdict, confidence score, and top actions are computed directly from the finding severity counts so the review always completes

---

## 4. Push Scan Pipeline

When the cron worker claims a `push_scan` job, it runs the deterministic rule engine against files fetched from the GitHub API.

```mermaid
flowchart TD
    Cron[Cron Worker] --> Claim[Claim next pending job]
    Claim -->|push_scan job| Auth[Get GitHub installation token]

    Auth --> Fetch[Fetch changed files\nfrom GitHub Commits API]

    Fetch --> Route{File type?}

    Route -->|*.yml in .github/workflows/| WF[workflow-yaml rules\npull_request_target + fork checkout\nmissing permissions]
    Route -->|Dockerfile| DF[dockerfile rules\nEOL base images\nENV secrets\nroot user]
    Route -->|package.json / requirements.txt / go.mod| Dep[dependency rules\nknown-vulnerable versions]
    Route -->|source files| Sec[secrets rules\nAPI key regex patterns\nhardcoded credentials]

    WF & DF & Dep & Sec --> Write[Write findings to findings table]
    Write --> Halt{Any critical\nor high findings?}
    Halt -->|Yes| HaltDec[Write halt decision\ndecision = halt\nexpires in 24h]
    Halt -->|No| AllowDec[Write halt decision\ndecision = allow]
    HaltDec & AllowDec --> Complete[Complete scan_job]
```

**Rule engine:**

Rules live in `lib/security/rules/` and implement a common interface:

```ts
interface SecurityRule {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  check(file: string, content: string): Finding[]
}
```

Findings are immutable — they are appended only, never updated. Resolution state (fixed, muted, false-positive) is tracked in a separate `resolutions` table.

---

## 5. CI Halt Gate

The halt gate is a two-component design: a decision writer (part of the push scan) and a decision reader (queried by the CI step).

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub Actions
    participant API as /api/pipeline/decision/:sha
    participant DSQL as Aurora DSQL

    Dev->>GH: git push → triggers workflow
    GH->>API: GET /api/pipeline/decision/{sha}
    API->>DSQL: SELECT decision FROM halt_decisions\nWHERE commit_sha = {sha}
    DSQL-->>API: { decision: "halt", severity: "critical", reason: "..." }
    API-->>GH: 200 { decision: "halt" }
    GH->>GH: exit 1 — pipeline blocked

    Note over GH,API: If no halt_decision row exists yet,\nAPI returns { decision: "allow" }\nso CI is never blocked on latency
```

**Timing guarantee:** The push scan job is enqueued immediately on webhook receipt. The cron worker fires within 60 seconds. Most pushes are scanned before a typical CI workflow reaches the gate step. If not, the API returns `allow` and the scan result is surfaced on the dashboard without blocking.

---

## 6. Stale Job Recovery

Vercel serverless functions have a maximum execution time. If the function is killed mid-review, the job stays in `status = 'processing'` indefinitely. The cron worker handles this with a recovery step at the start of every invocation.

```mermaid
flowchart TD
    Cron[Cron Worker starts] --> Stale[Reset jobs stuck in processing\nfor more than 5 minutes\nback to pending]
    Stale --> Claim[SELECT oldest pending job\nWHERE attempts < max_attempts]
    Claim -->|Found| Update[UPDATE status = processing\nattempts = attempts + 1]
    Update --> Run[Execute job]
    Run -->|Success| Done[status = completed]
    Run -->|Error caught| Fail[failJob\nstatus = pending if attempts < max\nstatus = failed if max reached]
    Run -->|Function timeout| Stuck[Job stays processing\nrecovered on next tick]
```

**The stale threshold is 5 minutes**, passed as a timestamp parameter to avoid DSQL INTERVAL compatibility issues.

**Retry behaviour:** On failure, the error message is stored in `scan_jobs.error` and the job resets to `pending` until `max_attempts` (3) is exhausted, at which point it moves to `failed` permanently.

---

## 7. Database Schema

```mermaid
erDiagram
    repos {
        uuid id PK
        bigint github_id
        varchar owner
        varchar name
        bigint installation_id
        boolean is_security_enrolled
    }

    scan_jobs {
        uuid id PK
        uuid repo_id
        varchar commit_sha
        varchar job_type
        varchar status
        int pr_number
        int attempts
        int max_attempts
        timestamptz started_at
    }

    pull_requests {
        uuid id PK
        uuid repo_id
        int pr_number
        text title
        varchar head_sha
        varchar status
        uuid review_id
    }

    pr_reviews {
        uuid id PK
        uuid pr_id
        uuid repo_id
        varchar verdict
        int confidence_score
        text summary
        jsonb top_actions
        int critical_count
        int high_count
        varchar status
    }

    agent_reports {
        uuid id PK
        uuid review_id
        varchar agent_type
        varchar status
        text summary
        jsonb findings
        int finding_count
        int duration_ms
    }

    findings {
        uuid id PK
        uuid repo_id
        varchar commit_sha
        varchar rule_id
        varchar severity
        text file_path
        int line_number
        text message
        varchar scan_type
    }

    halt_decisions {
        uuid id PK
        uuid repo_id
        varchar commit_sha
        varchar decision
        varchar severity
        text reason
        jsonb finding_ids
        timestamptz expires_at
    }

    resolutions {
        uuid id PK
        uuid finding_id
        varchar status
        varchar resolved_by
        text notes
    }

    repos ||--o{ scan_jobs : "has"
    repos ||--o{ pull_requests : "has"
    repos ||--o{ findings : "has"
    repos ||--o{ halt_decisions : "has"
    repos ||--o{ pr_reviews : "has"
    pull_requests ||--o| pr_reviews : "reviewed by"
    pr_reviews ||--o{ agent_reports : "contains"
    findings ||--o| resolutions : "resolved by"
```

**Aurora DSQL constraints applied throughout:**

- No foreign key constraints — referential integrity enforced at the application layer
- No `ON CONFLICT` unless backed by an inline `UNIQUE` constraint (async indexes cannot be conflict targets)
- All indexes created with `CREATE INDEX ASYNC`
- No `SELECT ... FOR UPDATE` or `SKIP LOCKED` — job claiming uses optimistic SELECT + conditional UPDATE

---

## 8. Component Map

```mermaid
graph TD
    subgraph API ["API Layer (app/api/)"]
        WH[webhook/route.ts]
        CW[cron/scan-worker/route.ts]
        PD[pipeline/decision/route.ts]
        PR[prs/id/route.ts]
        RH[repo-health/repoId/route.ts]
        AN[analytics/route.ts]
    end

    subgraph Review ["Review Pipeline (lib/review/ + lib/agents/)"]
        Runner[runner.ts\nOrchestrates Promise.all]
        Sec[security.ts]
        Bug[bugs.ts]
        Perf[performance.ts]
        Read[readability.ts]
        BP[best-practices.ts]
        Doc[documentation.ts]
        Synth[synthesizer.ts\nwith fallback]
    end

    subgraph Scanner ["Push Scanner (lib/scanner/ + lib/security/)"]
        Scan[index.ts]
        Rules[rules/\nsecrets · workflow-yaml\ndockerfile · dependency-hashes]
    end

    subgraph DB ["DB Layer (lib/db/)"]
        SJ[scan-jobs.ts]
        PRR[pr-reviews.ts]
        AR[agent-reports.ts]
        Find[findings.ts]
        HD[halt-decisions.ts]
        Repos[repos.ts]
    end

    subgraph GH ["GitHub (lib/github/)"]
        Auth[app-auth.ts\nRS256 JWT]
        Diff[pr-diff.ts]
        Verify[webhook-verify.ts\nHMAC-SHA256]
        Files[file-fetcher.ts]
    end

    subgraph LLM ["LLM (lib/llm/)"]
        Gemini[gemini.ts\ncallGemini / callGeminiJSON\n3-attempt retry]
    end

    CW --> Runner
    CW --> Scan
    Runner --> Sec & Bug & Perf & Read & BP & Doc
    Runner --> Synth
    Sec & Bug & Perf & Read & BP & Doc & Synth --> Gemini
    Runner --> AR
    Runner --> PRR
    Scan --> Rules
    Scan --> Find
    Scan --> HD
    WH --> Verify
    WH --> SJ
    WH --> Repos
    Runner --> Diff
    Runner --> Auth
    Scan --> Files
    Scan --> Auth
    PD --> HD
    PR --> PRR & AR
    RH --> Find & PRR
    AN --> AR & Find & PRR
```

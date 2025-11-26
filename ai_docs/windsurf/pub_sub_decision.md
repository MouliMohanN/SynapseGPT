# Pub/Sub Backend Decision for SSE Progress Updates

## Context

We want to stream **document edit background progress** (history save + RAG ingestion) to the UI via **Server-Sent Events (SSE)**. The flow:

- User edits a doc and hits **Save**.
- The `PUT /api/docs/[docId]` endpoint:
  - Writes the new file content and returns success immediately.
  - Kicks off background work:
    - Save history / patches.
    - Re-ingest the document into the vector store.
- While that background work runs, we want the server to push **progress events** to the UI over SSE.

In a serverless / multi-process environment, an in-memory event bus (a `Map<docId, listeners>` in Node) is **not reliable**, because each route invocation may run in a different process. We need a shared backend for pub/sub or event storage.

The main options discussed:

- Relational **DB** (Postgres/MySQL/SQLite)
- **Redis** (pub/sub or streams)
- **Kafka** (event streaming platform)

---

## Option 1: Relational DB (Postgres/MySQL/SQLite)

### How it would work

- Create a `doc_events` table, e.g.:

  - `id` (PK)
  - `doc_id` (string)
  - `created_at` (timestamp)
  - `type` (string)
  - `message` (string)
  - `meta` (JSON)

- `PUT /api/docs/[docId]` inserts rows as progress updates happen.
- SSE endpoint `/api/docs/[docId]/events`:
  - On connect: finds the latest `created_at` (or starts from `now`).
  - Periodically polls for `WHERE doc_id = ? AND created_at > last_seen`.
  - Streams any new rows as SSE `data: { ... }` events.

### Pros

- **Simple model**: just insert and query rows.
- **Durable**: progress events are persisted; can show historical activity per doc.
- **No extra infra** if a relational DB is already part of the stack.
- Easy fan-out: multiple consumers (UI, admin tools, analytics) can read the same data.

### Cons

- Not real pub/sub by default: SSE endpoint must **poll**, adding:
  - Slight latency (e.g. 0.5–1s poll interval).
  - Extra read load on the DB.
- Overkill if we only care about **ephemeral live progress** and not long-term history.
- If we dont already have a DB, this adds a new infra component (driver, migrations, hosting).

### When to prefer DB

- We already use Postgres/MySQL in this project.
- We want **persistent logs** of doc events ("what happened to this doc last week?").
- Traffic is moderate so periodic polling is acceptable.

---

## Option 2: Redis (Pub/Sub or Streams)

### How it would work

- Use Redis as a shared pub/sub or stream backend.

**Pub/Sub variant:**

- `PUT /api/docs/[docId]` publishes events:
  - Channel: `doc:<docId>`
  - Message: JSON `{ type, message, meta, timestamp }`.
- SSE endpoint subscribes to `doc:<docId>` and forwards messages to the client as SSE events.

**Stream variant (Redis Streams):**

- `PUT` appends to a stream `doc:<docId>`.
- SSE endpoint reads from the stream using a cursor (`XREAD`), sending each new entry as SSE.

### Pros

- **Designed for low-latency pub/sub** and ephemeral progress updates.
- Shared across all serverless functions / processes.
- Pub/Sub gives true push semantics: no polling needed.
- Streams add replay and consumer group semantics if we need them later.
- Operational footprint is smaller than Kafka.

### Cons

- Requires **Redis infra** (self-hosted or managed service like Upstash, Redis Cloud, etc.).
- Pub/Sub messages are **ephemeral**: if no SSE client is connected, those messages are lost (unless we use streams).
- In serverless environments, must be careful about connection limits, cold starts, and keeping connections open.
- Another moving part if the team is not familiar with Redis.

### When to prefer Redis

- We care about **live progress updates** with low latency.
- We are okay adding/using Redis (or already have it for caching/queues).
- Persistence beyond the current session is a nice-to-have, not a hard requirement.

---

## Option 3: Kafka

### How it would work

- Treat doc progress updates as events on a Kafka topic (e.g. `doc-events`).
- `PUT /api/docs/[docId]` writes events to that topic.
- A consumer service reads from Kafka and forwards relevant events to SSE clients.

### Pros

- **Powerful event streaming platform**:
  - High throughput, partitioning, ordering, and retention.
  - Multiple independent consumers with replay.
- Good fit if doc events are part of a **company-wide event backbone** used by many services.

### Cons

- **Massive overkill** for a single Next.js app that just needs progress updates.
- Significant operational complexity: cluster management, storage, monitoring, security.
- Not well-aligned with small/medium monolithic apps unless Kafka already exists in the organization.

### When to prefer Kafka

- The org already runs Kafka for other services.
- Doc events need to feed into analytics/ML/other services at scale, and the UI is only one of many consumers.

---

## Recommendation for This Project

Given the current scope:

- Single Next.js app.
- Background work limited to **document history** and **RAG ingestion**.
- Need for **live SSE progress updates** during saves.
- No clear existing relational DB stack in this repo.

The recommended order is:

1. **Redis (Pub/Sub or Streams)**
   - Best fit for low-latency SSE progress updates.
   - Clean separation: API routes publish progress, SSE routes subscribe and stream.
   - Works across serverless functions and multiple Node processes.

2. **Relational DB**
   - Good alternative if/when we introduce Postgres/MySQL for other features.
   - Provides persistent logs and simpler mental model at the cost of polling.

3. **Kafka**
   - Only consider if we later integrate with an existing Kafka platform and need cross-service event streaming.

### Concrete next steps (if we choose Redis)

- Introduce a small Redis client helper (e.g. using Upstash Redis SDK) in `src/lib/redis.ts`.
- Update `PUT /api/docs/[docId]` to publish progress events to `doc:<docId>` channels.
- Update `/api/docs/[docId]/events` SSE handler to subscribe to `doc:<docId>` and forward messages as SSE.
- Keep the existing in-memory bus for local/dev mode if we want to avoid Redis in development.

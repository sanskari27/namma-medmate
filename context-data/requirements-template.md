# Feature: <FEATURE_NAME>
## Requirements Document
**Version:** 1.0 | **Status:** Draft | **Owner:** <team>

---

## 1. Overview
<!-- One paragraph describing the feature and its business purpose -->

---

## 2. Functional Requirements

### FR-01: <Title>
**Priority:** MUST | SHOULD | COULD
**Description:** <what the system must do>
**Acceptance Criteria:**
- <measurable condition 1>
- <measurable condition 2>
**Dependencies:** FR-XX (if any)

### FR-02: <Title>
**Priority:** MUST
**Description:**
**Acceptance Criteria:**
- ...

<!-- Add as many FR-XX blocks as needed -->

---

## 3. API Specification

### Endpoint: <METHOD> /api/v1/<resource>
**Description:** <purpose>
**Auth Required:** Yes / No
**Required Roles:** ADMIN | USER | etc.

**Request Body:**
```json
{
  "field1": "string (required, max 255)",
  "field2": 0,
  "field3": "enum: VALUE_A | VALUE_B"
}
```

**Success Response — 201 Created:**
```json
{
  "id": 1,
  "field1": "string",
  "createdAt": "ISO-8601"
}
```

**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Missing or invalid fields |
| 401 | UNAUTHORIZED | No/invalid token |
| 403 | FORBIDDEN | Insufficient role |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate resource |

<!-- Add more endpoints as needed -->

---

## 4. Database Schema

### Table: <table_name>
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BIGSERIAL | NOT NULL | auto | Primary key |
| <column> | VARCHAR(255) | NOT NULL | — | <description> |
| <column> | BIGINT | NULL | — | FK to <other_table>.id |
| created_at | TIMESTAMP | NOT NULL | NOW() | Record creation time |
| updated_at | TIMESTAMP | NOT NULL | NOW() | Last update time |

**Indexes:**
- `idx_<table>_<col>` on `(<column>)` — reason: <why>
- `UNIQUE (column1, column2)` — reason: <why>

**Foreign Keys:**
- `<column>` → `<other_table>.id` ON DELETE CASCADE | RESTRICT | SET NULL

---

## 5. Business Rules

### BR-01: <Rule Title>
**Rule:** <Precise rule in plain English>
**When Violated:** <what error to return>
**Example:** <concrete example>

### BR-02: <Rule Title>
...

---

## 6. Integration Points
<!-- External services, events, queues this feature touches -->

| System | Type | Direction | Purpose |
|--------|------|-----------|---------|
| <Service> | REST | Outbound | <why called> |
| <Queue> | Kafka/RabbitMQ | Outbound | <event name> |

---

## 7. Non-Functional Requirements

| NFR | Requirement |
|-----|-------------|
| Performance | <endpoint> must respond in < 200ms at p99 |
| Rate Limiting | Max N requests per minute per user |
| Idempotency | <operation> must be idempotent |
| Pagination | List endpoints must support page/size params |

---

## 8. Out of Scope
<!-- Explicitly list what this feature does NOT cover -->
- <item 1>
- <item 2>

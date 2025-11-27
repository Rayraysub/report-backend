# DESIGN.md — Report Management Service Architecture & Design Rationale

This document explains the architecture, data model, authentication/authorization, validation, concurrency control, file upload, and query handling of the **Report Management Service (Node.js + TypeScript)**. It reflects the **actual implementation** of the service.

---

## 🎯 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)  
2. [Data Model Design](#2-data-model-design)  
3. [Authentication & Authorization](#3-authentication--authorization)  
4. [Validation Strategy](#4-validation-strategy)  
5. [File Upload Pipeline](#5-file-upload-pipeline)  
6. [Query System Design](#6-query-system-design)  
7. [Optimistic Concurrency Control](#7-optimistic-concurrency-control)  
8. [Audit Logging](#8-audit-logging)  
9. [Asynchronous Side Effects](#9-asynchronous-side-effects)  
10. [Testing Strategy](#10-testing-strategy)  
11. [Future Extensions](#11-future-extensions)  
12. [Conclusion](#12-conclusion)  

---

## 1. 🧱 System Architecture Overview

The service uses a **modular layered architecture**:

```
/src
├── /routes          # HTTP endpoints (reportRoutes.ts, authRoutes.ts)
├── /middleware      # JWT auth, RBAC, logging
├── /models          # In-memory NoSQL-style data
└── app.ts           # Express app bootstrap
/uploads             # File storage
/dist                # Compiled JS
```

**Principles:**

| Principle | Implementation | Benefit |
|-----------|----------------|---------|
| Separation of Concerns | Routes handle HTTP; middleware handles cross-cutting logic | Easier to maintain/test |
| Stateless Auth | JWT tokens, no session | Horizontal scaling |
| In-memory storage | Array of Report objects | Simple, assignment-compliant |
| Structured Validation | Zod schemas | Type safety + security |
| Consistent Error Schema | All errors contain `code`, `message`, optional `details` | Client consistency |

---

## 2. 🧩 Data Model Design

### Report Object

```ts
export type Status = 'draft' | 'submitted';
export type Priority = 'low' | 'medium' | 'high';

export interface Entry {
  id: string;
  content: string;
  createdAt: string;
  priority: Priority;
}

export interface Metrics {
  totalEntries: number;
  highPriorityEntries: number;
}

export interface Attachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

export interface Report {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  version: number;
  entries: Entry[];
  metrics: Metrics;
  auditLogs?: string[];
  attachments?: Attachment[];
}
```

**Design Rationale:**

| Choice | Reason |
|--------|--------|
| `version` | Optimistic concurrency control |
| `metrics` | Always returned for frontend logic |
| `auditLogs` | Track modifications/attachments |
| `attachments` | Abstracted file metadata |
| `entries` | Supports pagination, filtering, sorting |
| Enum constraints | Prevent invalid status/priority |

---

## 3. 🔐 Authentication & Authorization

### JWT Payload

```ts
interface JWTPayload {
  userId: string;
  role: 'reader' | 'editor';
  iat: number;
  exp: number;
}
```

### Role-based Access

| Route | Method | Role |
|-------|--------|------|
| `/reports` | POST | editor |
| `/reports/:id` | GET | reader/editor |
| `/reports/:id` | PUT | editor |
| `/reports/:id/attachment` | POST | editor |

**Why Middleware:**
- Centralized access control
- Easy to extend new roles
- Keeps route code clean

---

## 4. 🧮 Validation Strategy

- **Zod schemas** for POST/PUT requests
- Ensures required fields: `title`, optional `status`, `priority`
- PUT supports partial updates

**Error Response Example:**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "title": "Title is required"
  },
  "timestamp": "2025-11-25T12:00:00.000Z"
}
```

---

## 5. 📥 File Upload Pipeline

- **Multer** handles multipart/form-data
- Field name: `file`
- Allowed types: `.jpg`, `.jpeg`, `.png`, `.pdf`
- Max size: 5MB
- Stored in `/uploads` directory
- Metadata added to `Report.attachments` array
- Audit log updated

**Upload Response Example:**
```json
{
  "message": "File uploaded",
  "attachment": {
    "filename": "file-1764120209757-268757.jpg",
    "originalName": "file.jpg",
    "mimetype": "image/jpeg",
    "size": 432030,
    "url": "/uploads/file-1764120209757-268757.jpg"
  }
}
```

---

## 6. 📊 Query System Design

**GET /reports/:id** supports:

- `include=entries` → include nested entries
- Pagination: `entries_page`, `entries_size`
- Sorting: `entries_sort` (e.g., `createdAt_desc`)
- Filtering: `entries_highPriorityOnly=true`
- `view=compact` → returns only summary + metrics

**Metrics always included**, even in compact view.

---

## 7. 🔁 Optimistic Concurrency Control

- PUT request includes `version` field
- If mismatched, server returns 409 `VERSION_CONFLICT`

**Example:**
```json
PUT /reports/:id
{
  "title": "Updated title",
  "version": 1
}
```
Response if conflict:
```json
{
  "code": "VERSION_CONFLICT",
  "message": "Report version mismatch. Current version is 2",
  "details": {
    "clientVersion": 1,
    "serverVersion": 2
  }
}
```

---

## 8. 📜 Audit Logging

- Tracks modifications, uploads
- Stored in `Report.auditLogs` array
- Format:
```ts
"Updated fields: title at 2025-11-25T12:00:00.000Z"
"Uploaded attachment: file.jpg at 2025-11-25T12:01:00.000Z"
```

---

## 9. 🔄 Asynchronous Side Effects

- Simulated background tasks after POST
- Example: analytics logging, notifications
- Implemented using `setTimeout(() => {...}, 0)`

---

## 10. 🧪 Testing Strategy

**Reader role:**

- GET report ✔  
- POST/PUT/Upload ✘ (403 Forbidden)

**Editor role:**

- GET/POST/PUT/Upload ✔

**Manual curl commands** included for JWT token usage, role tests.

---

## 11. 🚀 Future Extensions

- Replace in-memory storage with MongoDB/PostgreSQL  
- Background job queue (Bull/SQS) for async tasks  
- File storage migration to S3  
- Rate limiting and monitoring  
- OpenAPI/Swagger docs

---

## 12. ✅ Conclusion

This design reflects:

- Clean modular TypeScript codebase  
- RESTful API design  
- Role-based JWT authentication  
- File upload and audit logging  
- Advanced querying (pagination/filtering/sorting)  
- Optimistic concurrency control  
- Full alignment with actual implemented code


# Report Management Service (Node.js + TypeScript)

A production-ready backend service implementing four core API endpoints (GET / PUT / POST / file upload) with comprehensive features:

- **TypeScript** - Type-safety and maintainability  
- **Express** - Lightweight web framework  
- **NoSQL-style in-memory storage** - Simple data persistence  
- **JWT authentication** - Stateless security  
- **Role-based access control** (reader/editor)  
- **Input validation** - Zod schema validation  
- **Structured error responses** - Consistent error handling  
- **File uploads** - Multer multipart support  
- **Pagination, filtering, sorting** - Advanced querying  
- **Optimistic concurrency control** - Data consistency  
- **Audit logs** - Operation tracking  
- **Asynchronous side effects** - Background processing  

This project demonstrates production-quality API design, modular code structure, validation, consistent error schema, and role-based authorization.

---

## 🚀 Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Runtime | Node.js LTS | Stable, widely used |
| Language | TypeScript | Type-safety, maintainability |
| Web Framework | Express | Lightweight and extensible |
| Validation | Zod | Runtime + compile-time validation |
| Auth | JWT | Stateless authentication |
| File Upload | Multer | Reliable multipart handling |
| Storage | In-memory arrays | Simple persistence solution |

---

## 📁 Project Structure

```
project-root/
├── src/
│   ├── routes/
│   │   ├── reportRoutes.ts      # Report CRUD endpoints
│   │   └── authRoutes.ts        # Authentication endpoints
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification + RBAC
│   │   └── logging.ts           # Request logging
│   ├── models/
│   │   └── report.ts            # Report data models
│   └── app.ts                   # Express app setup
├── uploads/                     # Uploaded files storage
├── dist/                        # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ LTS  
- npm 8+

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd report-management-service

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

**Server will run on:** `http://localhost:3000`

---

## 🔐 Authentication

This project uses JWT-based authentication with two distinct roles.

### User Roles

| Role | Permissions |
|------|-------------|
| **reader** | GET reports only |
| **editor** | GET + POST + PUT + file upload |

### Get JWT Tokens

#### Reader Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"readerUser","password":"reader"}'
```

#### Editor Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"editorUser","password":"editor"}'
```

**Response Example:**
```json
{
  "token": "<JWT_TOKEN>",
  "role": "editor",
  "expiresIn": "24h"
}
```

---

## 📘 API Endpoints

# 1️⃣ Create Report — `POST /reports`

**Role Required:** `editor`

### Request Body
```json
{
  "title": "My report",
  "status": "draft",
  "priority": "medium"
}
```

### Example Request
```bash
curl -X POST http://localhost:3000/reports \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"My report","status":"draft","priority":"high"}'
```

### Response
```json
{
  "id": "uuid",
  "title": "My report",
  "status": "draft",
  "priority": "medium",
  "createdAt": "2025-11-25T10:30:00.000Z",
  "updatedAt": "2025-11-25T10:30:00.000Z",
  "version": 1,
  "entries": [],
  "metrics": {
    "totalEntries": 0,
    "highPriorityEntries": 0
  },
  "attachments": []
}
```

---

# 2️⃣ Get Report — `GET /reports/:id`

**Role Required:** `reader` or `editor`

### Query Parameters

| Feature | Parameter | Example |
|--------|-----------|---------|
| Include entries | `include=entries` | Includes all report entries |
| Pagination | `entries_page=1&entries_size=5` | Paginate entries |
| Sorting | `entries_sort=createdAt_desc` | Sort entries |
| Filtering | `entries_highPriorityOnly=true` | Only high priority entries |
| Compact mode | `view=compact` | Smaller response body |

### Example Request
```bash
curl http://localhost:3000/reports/<id> \
  -H "Authorization: Bearer <token>"
```

### Full Response
```json
{
  "id": "uuid",
  "title": "My report",
  "status": "draft",
  "priority": "high",
  "createdAt": "2025-11-25T10:30:00.000Z",
  "updatedAt": "2025-11-25T11:45:00.000Z",
  "version": 1,
  "entries": [
    {
      "id": "entry-uuid",
      "content": "Entry content",
      "priority": "high",
      "createdAt": "2025-11-25T11:00:00.000Z"
    }
  ],
  "metrics": {
    "totalEntries": 10,
    "highPriorityEntries": 3
  },
  "attachments": [
    {
      "filename": "file.jpg",
      "originalName": "file.jpg",
      "mimetype": "image/jpeg",
      "size": 432030,
      "url": "/uploads/file.jpg"
    }
  ]
}
```

### Compact Response
```json
{
  "id": "uuid",
  "title": "My report",
  "status": "draft",
  "priority": "high",
  "updatedAt": "2025-11-25T11:45:00.000Z",
  "metrics": {
    "totalEntries": 10,
    "highPriorityEntries": 3
  }
}
```

---

# 3️⃣ Update Report — `PUT /reports/:id`

**Role Required:** `editor`  
Supports **partial updates** with **optimistic concurrency control**.

### Request Body
```json
{
  "title": "Updated title",
  "status": "submitted",
  "priority": "high",
  "version": 1
}
```

### Response
```json
{
  "id": "uuid",
  "title": "Updated title",
  "status": "submitted",
  "priority": "high",
  "createdAt": "2025-11-25T10:30:00.000Z",
  "updatedAt": "2025-11-25T12:00:00.000Z",
  "version": 2,
  "entries": [],
  "metrics": {
    "totalEntries": 0,
    "highPriorityEntries": 0
  },
  "attachments": []
}
```

---

# 4️⃣ Upload Attachment — `POST /reports/:id/attachment`

**Role Required:** `editor`  
**Form field:** `file`

### Allowed File Types
- `.jpg`, `.jpeg`, `.png`, `.pdf`

### Response
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

## 🛡️ Error Handling

Example structured error:

```json
{
  "code": "NOT_FOUND",
  "message": "Report not found",
  "timestamp": "2025-11-25T12:00:00.000Z"
}
```

### Error Codes

| Code | Status |
|------|--------|
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 400 |
| `VERSION_CONFLICT` | 409 |
| `INVALID_FILE_TYPE` | 400 |
| `FILE_TOO_LARGE` | 400 |

---

## ✔️ Testing Scenarios

### Reader
- GET ✔
- POST ✘
- PUT ✘
- Upload ✘

### Editor
- GET ✔
- POST ✔
- PUT ✔
- Upload ✔

---

## 🔧 Environment Variables

```
PORT=3000
JWT_SECRET=your-secret
JWT_EXPIRES_IN=24h
UPLOAD_DIR=uploads
```

---

## 🎉 Summary

This service demonstrates:

- Clean modular TypeScript code  
- JWT authentication  
- Role-based access control  
- Structured error handling  
- Input validation  
- Optimistic concurrency  
- File uploads  
- Audit logging  
- Advanced GET querying support  


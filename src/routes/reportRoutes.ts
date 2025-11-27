import { Router } from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { Report, reports } from '../models/report';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT, authorizeRole, AuthRequest } from '../middleware/auth';

// --- Multer setup ---
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const router = Router();

// --- Zod schema for report creation ---
const createReportSchema = z.object({
  title: z.string().min(1),
  status: z.enum(['draft', 'submitted']).optional().default('draft'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

// --- POST /reports → only editor can create ---
router.post(
  '/',
  authenticateJWT,
  authorizeRole(['editor']),
  (req: AuthRequest, res: Response) => {
    const parseResult = createReportSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        errors: parseResult.error.format(),
      });
    }

    const { title, status, priority } = parseResult.data;

    const newReport: Report = {
      id: uuidv4(),
      title,
      status,
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      entries: [],
      metrics: {
        totalEntries: 0,
        highPriorityEntries: 0,
      },
    };

    reports.push(newReport);

    res.status(201)
      .location(`/reports/${newReport.id}`)
      .json(newReport);
  }
);

// --- POST /reports/:id/attachment → only editor can upload ---
router.post(
  '/:id/attachment',
  authenticateJWT,
  authorizeRole(['editor']),
  upload.single('file'),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const report = reports.find(r => r.id === id);

    if (!report) {
      return res.status(404).json({ code: 'NOT_FOUND', message: `Report with id ${id} not found` });
    }

    if (!req.file) {
      return res.status(400).json({ code: 'NO_FILE', message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl
    };

    report.attachments = report.attachments || [];
    report.attachments.push(attachment);

    const auditEntry = `Uploaded attachment: ${attachment.originalName} at ${new Date().toISOString()}`;
    report.auditLogs = report.auditLogs || [];
    report.auditLogs.push(auditEntry);

    res.status(201).json({ message: 'File uploaded', attachment });
  }
);

// --- GET /reports/:id → reader/editor can view ---
router.get('/:id', authenticateJWT, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { include, view } = req.query;

  const report = reports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ code: 'NOT_FOUND', message: `Report with id ${id} not found` });
  }

  // Compact view
  if (view === 'compact') {
    const totalEntries = report.entries.length;
    const highPriorityEntries = report.entries.filter(e => e.priority === 'high').length;
    const highPriorityRate = totalEntries > 0 ? highPriorityEntries / totalEntries : 0;

    return res.json({
      id: report.id,
      title: report.title,
      status: report.status,
      priority: report.priority,
      metrics: report.metrics,
      entryCount: totalEntries,
      highPriorityRate,
    });
  }

  // Default / include handling
  let result: any = {};
  result.id = report.id;
  result.title = report.title;
  result.status = report.status;
  result.priority = report.priority;
  result.createdAt = report.createdAt;
  result.updatedAt = report.updatedAt;
  result.version = report.version;
  result.metrics = report.metrics;

  if (include) {
    const fields = (include as string).split(',').map(f => f.trim());

    if (fields.includes('entries')) {
      let entries = [...report.entries];

      // Filtering
      const highPriorityOnly = req.query.entries_highPriorityOnly === 'true';
      if (highPriorityOnly) {
        entries = entries.filter(e => e.priority === 'high');
      }

      // Sorting
      const sortParam = req.query.entries_sort as string | undefined;
      if (sortParam) {
        const [field, order] = sortParam.split('_');
        entries.sort((a, b) => {
          let aValue: any = (a as any)[field];
          let bValue: any = (b as any)[field];
          if (field === 'priority') {
            const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
            aValue = priorityMap[a.priority];
            bValue = priorityMap[b.priority];
          }
          if (aValue < bValue) return order === 'desc' ? 1 : -1;
          if (aValue > bValue) return order === 'desc' ? -1 : 1;
          return 0;
        });
      }

      // Pagination
      const page = parseInt(req.query.entries_page as string) || 1;
      const size = parseInt(req.query.entries_size as string) || 10;
      const validPage = Math.max(page, 1);
      const validSize = Math.min(Math.max(size, 1), 100);

      const totalEntries = entries.length;
      const totalPages = Math.ceil(totalEntries / validSize);

      const start = (validPage - 1) * validSize;
      const end = start + validSize;

      result.entries = entries.slice(start, end);
      result.entries_pagination = {
        page: validPage,
        size: validSize,
        totalPages,
        totalEntries,
      };
    }
  }

  res.json(result);
});

// --- PUT /reports/:id → only editor can update ---
const updateReportSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['draft', 'submitted']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  version: z.number().optional(),
});

router.put('/:id', authenticateJWT, authorizeRole(['editor']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const parseResult = updateReportSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      errors: parseResult.error.format(),
    });
  }

  const updates = parseResult.data;
  const report = reports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ code: 'NOT_FOUND', message: `Report with id ${id} not found` });
  }

  if (updates.version && updates.version !== report.version) {
    return res.status(409).json({
      code: 'VERSION_CONFLICT',
      message: `Report version mismatch. Current version is ${report.version}`,
    });
  }

  const changedFields: string[] = [];
  if (updates.title !== undefined && updates.title !== report.title) {
    report.title = updates.title;
    changedFields.push('title');
  }
  if (updates.status !== undefined && updates.status !== report.status) {
    report.status = updates.status;
    changedFields.push('status');
  }
  if (updates.priority !== undefined && updates.priority !== report.priority) {
    report.priority = updates.priority;
    changedFields.push('priority');
  }

  report.updatedAt = new Date().toISOString();
  report.version += 1;

  const auditEntry = `Updated fields: ${changedFields.join(', ') || 'none'} at ${report.updatedAt}`;
  report.auditLogs = report.auditLogs || [];
  report.auditLogs.push(auditEntry);

  return res.json(report);
});

export default router;
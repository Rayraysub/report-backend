export type Status = 'draft' | 'submitted';
export type Priority = 'low' | 'medium' | 'high';

export interface Entry {
  id: string; // primary key
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
  size: number; // bytes
  url: string;  // path or URL to access the file
}

export interface Report {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  version: number; // optimistic concurrency control
  entries: Entry[];
  metrics: Metrics;
  auditLogs?: string[];
  attachments?: Attachment[];
}

export const reports: Report[] = [];
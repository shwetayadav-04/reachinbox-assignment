// ── Shared TypeScript types for the frontend ────────────────────────────────

export type EmailStatus = "SCHEDULED" | "SENT" | "FAILED";

export interface Email {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  senderId: string;
  sender?: Sender;
  createdAt: string;
  updatedAt: string;
}

export interface Sender {
  id: string;
  email: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ScheduleEmailPayload {
  sender?: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
}

export interface CsvUploadResult {
  message: string;
  data: {
    totalRows: number;
    scheduled: number;
    failed: number;
    errors: Array<{ rowNumber: number; error: string }>;
  };
}

export interface HealthResponse {
  status: string;
  uptime: number;
}

import axios from "axios";
import type {
  Email,
  PaginatedResponse,
  ScheduleEmailPayload,
  CsvUploadResult,
  HealthResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
  withCredentials: true,
});

// Interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local state if we want, or trigger a redirect event
      // We will handle redirect in our Auth context.
    }
    return Promise.reject(error);
  }
);

// ── Health ────────────────────────────────────────────────────────────────────
export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function checkAuth() {
  const { data } = await api.get<{ data: { id: string; name: string; email: string; avatarUrl?: string } }>("/api/auth/me");
  return data.data;
}

export async function logout() {
  await api.post("/api/auth/logout");
}

// ── Emails ────────────────────────────────────────────────────────────────────

export async function scheduleEmail(
  payload: ScheduleEmailPayload
): Promise<Email> {
  const { data } = await api.post<{ message: string; data: Email }>(
    "/api/emails/schedule",
    payload
  );
  return data.data;
}

export async function getScheduledEmails(
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Email>> {
  const { data } = await api.get<PaginatedResponse<Email>>(
    "/api/emails/scheduled",
    { params: { page, limit } }
  );
  return data;
}

export async function getSentEmails(
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Email>> {
  const { data } = await api.get<PaginatedResponse<Email>>(
    "/api/emails/sent",
    { params: { page, limit } }
  );
  return data;
}

export async function getEmailById(id: string): Promise<Email> {
  const { data } = await api.get<{ data: Email }>(`/api/emails/${id}`);
  return data.data;
}

export async function uploadCsv(file: File): Promise<CsvUploadResult> {
  const formData = new FormData();
  formData.append("csv", file);
  const { data } = await api.post<CsvUploadResult>(
    "/api/emails/upload-csv",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function searchEmails(
  query: string,
  status?: "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED",
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Email>> {
  const { data } = await api.get<PaginatedResponse<Email>>("/api/search/emails", {
    params: { q: query, status, page, limit },
  });
  return data;
}

// ── Queue ─────────────────────────────────────────────────────────────────────

export interface QueueCounts {
  waiting: number;
  delayed: number;
  active: number;
  completed: number;
  failed: number;
  paused: number;
}

export interface QueueJob {
  jobId: string;
  name: string;
  state: string;
  attemptsMade: number;
  timestamp: number | null;
  processedOn: number | null;
  finishedOn: number | null;
  failedReason: string | null;
}

export interface QueueStats {
  counts: QueueCounts;
  recentJobs: QueueJob[];
}

export async function getQueueStats(): Promise<QueueStats> {
  const { data } = await api.get<{ data: QueueStats }>("/api/queue/stats");
  return data.data;
}

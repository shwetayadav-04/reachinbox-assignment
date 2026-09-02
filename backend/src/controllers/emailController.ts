import { Request, Response, NextFunction } from "express";
import { EmailStatus } from "@prisma/client";
import {
  scheduleEmail,
  getEmailById,
  getEmailsByStatus,
} from "../services/emailService";
import { parseAndValidateEmailCsv } from "../services/csvParser";
import { AppError } from "../middleware/errorHandler";
import { env } from "../config/env";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePagination(query: Record<string, unknown>): { page: number; limit: number } {
  const page = Math.max(1, parseInt(String(query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? "20"), 10) || 20));
  return { page, limit };
}

function validationError(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 400;
  return err;
}

// ── POST /api/emails/schedule ─────────────────────────────────────────────────

export async function scheduleEmailHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sender, recipient, subject, body, scheduledAt } = req.body as Record<string, unknown>;

    // ── Validation ────────────────────────────────────────────────────────────
    
    // Fallback to configured ETHEREAL_FROM if no sender is provided.
    const senderEmail = (typeof sender === "string" && sender.trim()) ? sender.trim().toLowerCase() : env.smtp.from.toLowerCase();

    if (!recipient || typeof recipient !== "string" || !recipient.trim()) {
      return next(validationError("recipient is required"));
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient.trim())) {
      return next(validationError("recipient must be a valid email address"));
    }

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return next(validationError("subject is required"));
    }

    if (!body || typeof body !== "string" || !body.trim()) {
      return next(validationError("body is required"));
    }

    if (!scheduledAt) {
      return next(validationError("scheduledAt is required"));
    }

    const scheduledDate = new Date(scheduledAt as string);
    if (isNaN(scheduledDate.getTime())) {
      return next(validationError("scheduledAt must be a valid ISO-8601 date string"));
    }

    if (scheduledDate <= new Date()) {
      return next(validationError("scheduledAt must be a future date/time"));
    }

    // ── Business logic delegated to service ──────────────────────────────────
    const email = await scheduleEmail({
      senderEmail,
      recipient: recipient.trim(),
      subject: subject.trim(),
      body: body.trim(),
      scheduledAt: scheduledDate,
    });

    res.status(201).json({
      message: "Email scheduled successfully",
      data: email,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/emails/scheduled ─────────────────────────────────────────────────

export async function getScheduledEmailsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pagination = parsePagination(req.query);
    const result = await getEmailsByStatus(EmailStatus.SCHEDULED, pagination);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/emails/sent ──────────────────────────────────────────────────────

export async function getSentEmailsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pagination = parsePagination(req.query);
    const result = await getEmailsByStatus(EmailStatus.SENT, pagination);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/emails/:id ───────────────────────────────────────────────────────

export async function getEmailByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return next(validationError("id param is required"));
    }

    const email = await getEmailById(id);

    if (!email) {
      const err: AppError = new Error(`Email with id "${id}" not found`);
      err.statusCode = 404;
      return next(err);
    }

    res.json({ data: email });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/emails/upload-csv ───────────────────────────────────────────────

export async function uploadCsvHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      return next(validationError("No CSV file uploaded"));
    }

    const { validRows, errors } = parseAndValidateEmailCsv(req.file.buffer);

    // Allow overriding sender via form field, otherwise fallback to ETHEREAL_FROM
    const senderEmail = (typeof req.body.sender === "string" && req.body.sender.trim()) 
      ? req.body.sender.trim().toLowerCase() 
      : env.smtp.from.toLowerCase();

    let scheduledCount = 0;

    for (const row of validRows) {
      try {
        await scheduleEmail({
          senderEmail,
          recipient: row.recipient,
          subject: row.subject,
          body: row.body,
          scheduledAt: row.scheduledAt,
        });
        scheduledCount++;
      } catch (err: any) {
        errors.push({
          rowNumber: 0, 
          error: `Failed to schedule email for ${row.recipient}: ${err.message}`
        });
      }
    }

    res.status(207).json({
      message: "CSV processed",
      data: {
        totalRows: validRows.length + errors.filter(e => e.rowNumber > 0).length,
        scheduled: scheduledCount,
        failed: errors.length,
        errors,
      },
    });
  } catch (err) {
    next(err);
  }
}

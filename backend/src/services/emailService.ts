import { EmailStatus, Prisma } from "@prisma/client";
import prisma from "../db/prisma";
import { emailQueue } from "../queue/emailQueue";
import { indexEmail, updateEmail } from "./elasticsearchService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScheduleEmailInput {
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

// ── Schedule ──────────────────────────────────────────────────────────────────

/**
 * Persists a new email record and enqueues a BullMQ delayed job.
 *
 * Idempotency layer 1: using `email.id` as the BullMQ jobId means BullMQ
 * will silently ignore any duplicate `add()` call for the same ID.
 */
export async function scheduleEmail(input: ScheduleEmailInput) {
  // 1. Lookup or create Sender.
  const sender = await prisma.sender.upsert({
    where: { email: input.senderEmail },
    update: {},
    create: { email: input.senderEmail },
  });

  // 2. Persist to PostgreSQL first so we have a stable ID.
  const email = await prisma.email.create({
    data: {
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      scheduledAt: input.scheduledAt,
      status: EmailStatus.SCHEDULED,
      senderId: sender.id,
    },
  });

  // 3. Index into Elasticsearch (Errors are caught internally, preventing Postgres/BullMQ failures)
  await indexEmail(email, input.senderEmail);

  // 4. Calculate the delay (ms). If scheduledAt is already past (e.g. due to
  //    clock drift), BullMQ will execute the job immediately.
  const delay = Math.max(input.scheduledAt.getTime() - Date.now(), 0);

  // 5. Enqueue a delayed job. jobId = email.id ensures idempotency.
  //    PostgreSQL and Redis are NOT one atomic transaction. If the queue
  //    enqueue fails after the DB row is created, we perform a compensating
  //    update to mark the email FAILED so it is not silently orphaned.
  try {
    await emailQueue.add(
      "send-email",
      { emailId: email.id, senderId: sender.id },
      {
        jobId: email.id,
        delay,
      }
    );
  } catch (queueErr) {
    console.error(
      `❌ Failed to enqueue job for email ${email.id}. Marking FAILED in DB.`,
      queueErr
    );
    await prisma.email.update({
      where: { id: email.id },
      data: { status: EmailStatus.FAILED, attempts: { increment: 1 } },
    });
    // Also update ES so it's consistent
    await updateEmail(email.id, { status: EmailStatus.FAILED });
    throw queueErr; // propagate so the caller (CSV handler) counts this row as failed
  }

  return email;
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getEmailById(id: string) {
  return prisma.email.findUnique({ where: { id } });
}

export async function getEmailsByStatus(
  status: EmailStatus,
  { page, limit }: PaginationParams
) {
  const skip = (page - 1) * limit;

  const [emails, total] = await prisma.$transaction([
    prisma.email.findMany({
      where: { status },
      orderBy: { scheduledAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.email.count({ where: { status } }),
  ]);

  return {
    data: emails,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ── Worker helpers ────────────────────────────────────────────────────────────

/**
 * Atomically transitions an email from SCHEDULED/FAILED → PROCESSING.
 * Returns null if the email is already SENT (idempotency layer 2).
 */
export async function markProcessing(emailId: string) {
  const email = await prisma.email.findUnique({ where: { id: emailId } });

  if (!email) {
    throw new Error(`Email ${emailId} not found in database`);
  }

  // Idempotency layer 2: never re-send an already sent email.
  if (email.status === EmailStatus.SENT) {
    return null;
  }

  const updated = await prisma.email.update({
    where: { id: emailId },
    data: {
      status: EmailStatus.PROCESSING,
    },
  });

  await updateEmail(emailId, { status: EmailStatus.PROCESSING });

  return updated;
}

export async function markSent(emailId: string) {
  const sentDate = new Date();
  const updated = await prisma.email.update({
    where: { id: emailId },
    data: {
      status: EmailStatus.SENT,
      sentAt: sentDate,
    },
  });

  await updateEmail(emailId, { status: EmailStatus.SENT, sentAt: sentDate });

  return updated;
}

export async function markFailed(emailId: string) {
  const updated = await prisma.email.update({
    where: { id: emailId },
    data: {
      status: EmailStatus.FAILED,
      attempts: { increment: 1 },
    },
  });

  await updateEmail(emailId, { status: EmailStatus.FAILED });

  return updated;
}

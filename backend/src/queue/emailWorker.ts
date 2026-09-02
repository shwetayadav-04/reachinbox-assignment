import { Worker, Job, DelayedError } from "bullmq";
import { getBullMQConnection } from "./connection";
import { QUEUE_NAME } from "./emailQueue";
import { EmailJobData } from "../types/queue";
import { markProcessing, markSent, markFailed } from "../services/emailService";
import { sendEmail } from "../services/smtpService";
import { checkSenderRateLimit } from "../services/rateLimiter";
import { notifyRateLimitHit } from "../services/slackNotificationService";
import { env } from "../config/env";
import prisma from "../db/prisma";

/**
 * BullMQ worker — runs in its own process (src/worker.ts).
 */
export const emailWorker = new Worker<EmailJobData>(
  QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { emailId, senderId } = job.data;

    console.log(`📨 Processing job ${job.id} for email ${emailId} (Sender: ${senderId})`);

    // ── Rate Limiting & Throttling ──
    const rateLimit = await checkSenderRateLimit(senderId, job.id!);
    if (!rateLimit.allowed) {
      console.log(`⏳ Rate limit hit (${rateLimit.reason}). Delaying job ${job.id} to ${new Date(rateLimit.nextAvailableTime).toISOString()}`);
      
      const sender = await prisma.sender.findUnique({ where: { id: senderId } });
      if (sender) {
        void notifyRateLimitHit({
          type: rateLimit.reason!,
          senderEmail: sender.email,
          emailId,
          jobId: job.id!,
          nextAttemptAt: rateLimit.nextAvailableTime,
        });
      }

      // Delay the job. This preserves job.id and does NOT consume a retry attempt.
      await job.moveToDelayed(rateLimit.nextAvailableTime, job.token!);
      throw new DelayedError();
    }

    // Idempotency layer 2: abort if the email was already sent.
    const email = await markProcessing(emailId);
    if (!email) {
      console.log(`⏭️  Email ${emailId} is already SENT — skipping.`);
      return;
    }

    // Send via Ethereal SMTP
    const { previewUrl } = await sendEmail({
      to: email.recipient,
      subject: email.subject,
      body: email.body,
    });

    // Persist success
    await markSent(emailId);

    console.log(`✅ Email ${emailId} sent to ${email.recipient}`);
    if (previewUrl) {
      // Log the Ethereal preview URL so developers can inspect the message
      console.log(`🔗 Preview: ${previewUrl}`);
    }
  },
  {
    connection: getBullMQConnection(),
    concurrency: env.worker.concurrency,
  }
);

// ── Worker events ─────────────────────────────────────────────────────────────

emailWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

emailWorker.on("failed", async (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);

  // After BullMQ exhausts all retry attempts, mark the email FAILED in the DB
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    try {
      await markFailed(job.data.emailId);
    } catch (dbErr) {
      console.error("Failed to mark email as FAILED in DB:", dbErr);
    }
  }
});

emailWorker.on("error", (err) => {
  console.error("❌ Worker error:", err.message);
});

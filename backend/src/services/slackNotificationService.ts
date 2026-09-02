import prisma from "../db/prisma";
import redisClient from "../config/redis";
import { decrypt } from "./encryptionService";
import { sendMessage } from "./slackService";
import { env } from "../config/env";

export interface RateLimitHitParams {
  type: "HOURLY_LIMIT" | "MIN_DELAY";
  senderEmail: string;
  emailId: string;
  jobId: string;
  nextAttemptAt: number;
}

export async function notifyRateLimitHit(params: RateLimitHitParams): Promise<void> {
  try {
    // 1. Deduplication using Redis
    const dedupKey = `slack_notified:${params.jobId}:${params.type}`;
    // Try to set the key. NX = only set if it does not exist. EX = expire in 24 hours.
    // If it returns null/0, the key already existed, so we skip notification.
    const setRes = await redisClient.set(dedupKey, "1", "EX", 86400, "NX");
    if (!setRes) {
      console.log(`⏭️  Slack notification for rate limit (Job: ${params.jobId}, Type: ${params.type}) already sent recently. Skipping.`);
      return; // Already notified for this specific job and rate limit type
    }

    // 2. Fetch the active Slack installation
    // We assume the most recently updated installation is the active one, 
    // or just fetch the first one since usually there's only one per app.
    const installation = await prisma.slackInstallation.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!installation) {
      console.warn("⚠️ Slack notification skipped: No active Slack installation found in database.");
      return; // Slack not connected, silently return
    }

    // 3. Determine the channel
    const channelId = installation.notificationChannelId || env.slack.notificationChannelId;
    if (!channelId) {
      console.warn("⚠️ Slack notification skipped: No notification channel configured.");
      return; // No channel configured
    }

    // 4. Decrypt token
    const token = decrypt(installation.accessToken);

    // 5. Format message
    const dateStr = new Date(params.nextAttemptAt).toISOString();
    const text = `⚠️ Email rate limit reached\nType: ${params.type}\nSender: ${params.senderEmail}\nEmail ID: ${params.emailId}\nNext attempt: ${dateStr}`;

    // 6. Send message
    console.log(`💬 Attempting to send Slack notification for rate limit to channel: ${channelId}`);
    await sendMessage(token, channelId, text);
    console.log(`✅ Slack notification sent successfully for job ${params.jobId}`);
    
  } catch (err: any) {
    // Top-level failsafe: never crash the worker because of a Slack notification error
    console.error(`❌ [Slack Notification Error] Failed to send rate-limit notification: ${err.message}`);
  }
}

import { checkSenderRateLimit } from "../services/rateLimiter";
import { notifyRateLimitHit } from "../services/slackNotificationService";
import { emailWorker } from "../queue/emailWorker";
import { emailQueue } from "../queue/emailQueue";
import prisma from "../db/prisma";
import redisClient from "../config/redis";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log("--- Starting Rate Limit Tests ---");

  // 1 & 2. Test MIN_EMAIL_DELAY_SECONDS
  console.log("\n[Test 1] Testing MIN_EMAIL_DELAY_SECONDS enforcement (Expected: 1 allowed, 1 denied)");
  const senderId = "test-sender-delay-" + Date.now();
  
  const res1 = await checkSenderRateLimit(senderId, "job-1");
  console.log("Job 1:", res1);
  if (!res1.allowed) throw new Error("Job 1 should be allowed");

  const res2 = await checkSenderRateLimit(senderId, "job-2");
  console.log("Job 2:", res2);
  if (res2.allowed || res2.reason !== "MIN_DELAY") throw new Error("Job 2 should be denied for MIN_DELAY");

  // 3 & 4. Mock Date.now to test HOURLY_LIMIT
  console.log("\n[Test 2] Testing MAX_EMAILS_PER_HOUR enforcement");
  const senderHourly = "test-sender-hourly-" + Date.now();
  
  const originalDateNow = Date.now;
  // Use a fixed timestamp (e.g. 10:00:00 UTC) so advancing 520 seconds never crosses the hour boundary.
  let simulatedTime = Date.UTC(2026, 0, 1, 10, 0, 0);
  global.Date.now = () => simulatedTime;

  let hourlyAllowed = 0;
  let hourlyDenied = 0;
  
  // We need to send 51 emails, spaced out by 10 seconds each to avoid MIN_DELAY
  for (let i = 1; i <= 52; i++) {
    const res = await checkSenderRateLimit(senderHourly, `job-h-${i}`);
    if (res.allowed) {
      hourlyAllowed++;
    } else if (res.reason === "HOURLY_LIMIT") {
      hourlyDenied++;
    }
    simulatedTime += 10001; // Advance 10s + 1ms
  }
  
  global.Date.now = originalDateNow; // Restore
  console.log(`Hourly results: ${hourlyAllowed} allowed, ${hourlyDenied} denied (HOURLY_LIMIT)`);
  if (hourlyAllowed !== 50 || hourlyDenied !== 2) {
    throw new Error(`Expected 50 allowed, 2 denied. Got ${hourlyAllowed} allowed, ${hourlyDenied} denied.`);
  }

  // 5. Slack Notification Deduplication
  console.log("\n[Test 3] Testing Slack notification deduplication (Expected: 1 sent, 1 skipped)");
  
  // We will spy on console.log to see if it prints the "skipped" message
  const originalLog = console.log;
  let skippedLogFound = false;
  let sentLogFound = false;
  console.log = (...args) => {
    if (args[0] && typeof args[0] === 'string') {
      if (args[0].includes("already sent recently. Skipping.")) skippedLogFound = true;
      if (args[0].includes("Slack notification sent successfully") || args[0].includes("Slack notification skipped: No active Slack installation found")) sentLogFound = true;
    }
    originalLog(...args);
  };

  const jobId = "slack-test-job-" + Date.now();
  await notifyRateLimitHit({
    type: "HOURLY_LIMIT",
    senderEmail: "test@example.com",
    emailId: "email-1",
    jobId,
    nextAttemptAt: Date.now() + 3600000
  });

  await notifyRateLimitHit({
    type: "HOURLY_LIMIT",
    senderEmail: "test@example.com",
    emailId: "email-1",
    jobId,
    nextAttemptAt: Date.now() + 3600000
  });

  console.log = originalLog;
  console.log(`Slack Notif Test -> Sent Attempted: ${sentLogFound}, Skipped Second: ${skippedLogFound}`);
  if (!skippedLogFound) throw new Error("Slack notification deduplication failed.");

  console.log("\n--- All tests passed! ---");
  await prisma.$disconnect();
  redisClient.disconnect();
  await emailQueue.close();
  await emailWorker.close();
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

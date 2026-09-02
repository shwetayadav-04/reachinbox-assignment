import { Queue } from "bullmq";
import { getBullMQConnection } from "./connection";
import { EmailJobData } from "../types/queue";

export const QUEUE_NAME = "email-schedule";

/**
 * Shared Queue instance used by both the API (to add jobs) and the worker (to read them).
 * Import this wherever you need to interact with the queue.
 */
export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      // Exponential: 5 s → 10 s → 20 s between retries.
      // BullMQ handles the delay automatically; no setTimeout/setInterval needed.
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

emailQueue.on("error", (err) => {
  console.error(`❌ Queue [${QUEUE_NAME}] error:`, err.message);
});

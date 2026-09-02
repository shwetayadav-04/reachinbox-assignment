/**
 * Worker process entry point.
 *
 * Run this independently of the Express API:
 *   npm run worker:dev   (development, hot-reload)
 *   npm run worker       (production, compiled)
 *
 * This process ONLY runs the BullMQ worker — it does not start an HTTP server.
 * Keeping the worker separate means it can be scaled independently.
 */

// env.ts must be the first import so dotenv.config() runs before anything else
import "./config/env";
import { emailWorker } from "./queue/emailWorker";
import prisma from "./db/prisma";
import redisClient from "./config/redis";

console.log("🔧 Email worker starting…");
console.log(`   Concurrency: ${emailWorker.concurrency}`);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`\n⚠️  Worker received ${signal}. Shutting down…`);

  // close() waits for any in-progress jobs to finish before stopping
  await emailWorker.close();
  await prisma.$disconnect();
  redisClient.disconnect();

  console.log("✅ Worker stopped cleanly.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

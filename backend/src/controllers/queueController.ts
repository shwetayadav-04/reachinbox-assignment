import { Request, Response, NextFunction } from "express";
import { emailQueue } from "../queue/emailQueue";

const RECENT_JOBS_LIMIT = 50;

export interface QueueStats {
  counts: {
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
    paused: number;
  };
  recentJobs: RecentJob[];
}

export interface RecentJob {
  jobId: string;
  name: string;
  state: string;
  attemptsMade: number;
  timestamp: number | null;
  processedOn: number | null;
  finishedOn: number | null;
  failedReason: string | null;
}

export async function getQueueStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get all job counts from BullMQ
    const counts = await emailQueue.getJobCounts(
      "waiting",
      "delayed",
      "active",
      "completed",
      "failed",
      "paused"
    );

    // Fetch recent jobs from all states (limited)
    const limit = Math.floor(RECENT_JOBS_LIMIT / 5);
    const [waiting, delayed, active, completed, failed] = await Promise.all([
      emailQueue.getJobs(["waiting"], 0, limit - 1),
      emailQueue.getJobs(["delayed"], 0, limit - 1),
      emailQueue.getJobs(["active"], 0, limit - 1),
      emailQueue.getJobs(["completed"], 0, limit - 1),
      emailQueue.getJobs(["failed"], 0, limit - 1),
    ]);

    const allJobs = [...waiting, ...delayed, ...active, ...completed, ...failed];

    const recentJobs: RecentJob[] = await Promise.all(
      allJobs.map(async (job) => {
        const state = await job.getState();
        return {
          jobId: String(job.id),
          name: job.name,
          state,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp ?? null,
          processedOn: job.processedOn ?? null,
          finishedOn: job.finishedOn ?? null,
          // Safe: only expose the reason string, not job data/email content
          failedReason: job.failedReason ?? null,
        };
      })
    );

    // Sort by timestamp descending (most recent first)
    recentJobs.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

    const result: QueueStats = {
      counts: {
        waiting: counts.waiting ?? 0,
        delayed: counts.delayed ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        paused: counts.paused ?? 0,
      },
      recentJobs: recentJobs.slice(0, RECENT_JOBS_LIMIT),
    };

    res.json({ data: result });
  } catch (err) {
    console.error("[QueueStats] Failed to fetch BullMQ stats:", err);
    next(err);
  }
}

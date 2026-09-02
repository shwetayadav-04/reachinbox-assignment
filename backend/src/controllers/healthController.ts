import { Request, Response } from "express";

/**
 * GET /health
 * Lightweight liveness probe — used by load balancers and Docker healthchecks.
 */
export function healthCheck(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok" });
}

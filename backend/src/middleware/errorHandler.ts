import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Centralized error-handling middleware.
 * Must be registered LAST (after all routes) so Express routes it correctly.
 *
 * Express identifies error middleware by the 4-argument signature (err, req, res, next).
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // next must be present even if unused — Express requires all 4 params
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode === 500 ? "Internal Server Error" : err.message;

  // Always log the real error server-side
  console.error(`[Error ${statusCode}]`, err.message);
  if (statusCode === 500) console.error(err.stack);

  res.status(statusCode).json({ error: message });
}

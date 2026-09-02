import { Request, Response, NextFunction } from "express";
import { searchEmails } from "../services/elasticsearchService";
import { EmailStatus } from "@prisma/client";

export async function searchEmailsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const q = req.query.q as string || "";
    const status = req.query.status as EmailStatus | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await searchEmails(q, status, page, limit);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

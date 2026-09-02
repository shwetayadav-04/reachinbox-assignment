import { Router } from "express";
import {
  scheduleEmailHandler,
  getScheduledEmailsHandler,
  getSentEmailsHandler,
  getEmailByIdHandler,
  uploadCsvHandler,
} from "../controllers/emailController";
import { uploadCsvMiddleware } from "../middleware/upload";

import { requireAuth } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all email routes
router.use(requireAuth);

// IMPORTANT: fixed-path routes must come before the dynamic route (/:id),
// otherwise Express would match them as IDs.
router.post("/schedule", scheduleEmailHandler);
router.post("/upload-csv", uploadCsvMiddleware.single("csv"), uploadCsvHandler);
router.get("/scheduled", getScheduledEmailsHandler);
router.get("/sent", getSentEmailsHandler);
router.get("/:id", getEmailByIdHandler);

export default router;

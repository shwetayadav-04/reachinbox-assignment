import { Router } from "express";
import { searchEmailsHandler } from "../controllers/searchController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/search/emails?q=...&status=SCHEDULED
router.get("/emails", requireAuth, searchEmailsHandler);

export default router;

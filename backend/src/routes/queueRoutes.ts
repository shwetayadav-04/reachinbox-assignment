import { Router } from "express";
import { getQueueStats } from "../controllers/queueController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/queue/stats — protected, returns live BullMQ queue statistics
router.get("/stats", requireAuth, getQueueStats);

export default router;

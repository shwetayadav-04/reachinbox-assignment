import { Router } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import slackRouter from "./slack";

const router = Router();

// Mount route groups — add new route files here as the app grows
router.use("/", healthRouter);
router.use("/api/emails", emailRouter);
router.use("/api/slack", slackRouter);

export default router;

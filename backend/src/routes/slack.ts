import { Router } from "express";
import {
  getOAuthUrlHandler,
  oauthCallbackHandler,
  getStatusHandler,
  getChannelsHandler,
  selectChannelHandler
} from "../controllers/slackController";

const router = Router();

router.get("/oauth", getOAuthUrlHandler);
router.get("/oauth/callback", oauthCallbackHandler);
router.get("/status", getStatusHandler);
router.get("/channels", getChannelsHandler);
router.post("/channel", selectChannelHandler);

export default router;

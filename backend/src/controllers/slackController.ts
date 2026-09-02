import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import redisClient from "../config/redis";
import prisma from "../db/prisma";
import { getOAuthUrl, exchangeOAuthCode, listChannels, validateChannel } from "../services/slackService";
import { encrypt, decrypt } from "../services/encryptionService";
import { env } from "../config/env";

// ── GET /api/slack/oauth ──────────────────────────────────────────────────────

export async function getOAuthUrlHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Generate crypto-random state
    const state = crypto.randomBytes(32).toString("hex");
    
    // Store in Redis with 10-minute expiration
    await redisClient.set(`slack_oauth_state:${state}`, "1", "EX", 600);

    const url = await getOAuthUrl(state);
    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/slack/oauth/callback ─────────────────────────────────────────────

export async function oauthCallbackHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, state, error } = req.query;

    if (error) {
      res.status(400).send(`OAuth Error: ${error}`);
      return;
    }

    if (!code || typeof code !== "string" || !state || typeof state !== "string") {
      res.status(400).send("Missing code or state");
      return;
    }

    // Single-use state validation: GET and DEL atomically (or pipeline)
    // Actually we can just GET it, and if it exists, DEL it.
    // Or use multi/exec. We will just DEL it and check if it returned 1.
    const deleted = await redisClient.del(`slack_oauth_state:${state}`);
    if (deleted !== 1) {
      res.status(400).send("Invalid or expired OAuth state");
      return;
    }

    // Exchange code
    const tokenData = await exchangeOAuthCode(code);
    
    if (!tokenData.access_token || !tokenData.team?.id) {
      res.status(400).send("Invalid token response from Slack");
      return;
    }

    // Encrypt token
    const encryptedToken = encrypt(tokenData.access_token);

    // Persist
    await prisma.slackInstallation.upsert({
      where: { teamId: tokenData.team.id },
      update: {
        teamName: tokenData.team.name,
        botUserId: tokenData.authed_user?.id,
        accessToken: encryptedToken,
      },
      create: {
        teamId: tokenData.team.id,
        teamName: tokenData.team.name,
        botUserId: tokenData.authed_user?.id,
        accessToken: encryptedToken,
      }
    });

    res.status(200).send(`
      <html>
        <body>
          <h2>Slack App Connected Successfully</h2>
          <p>Team: ${tokenData.team.name}</p>
          <p>You can close this window.</p>
        </body>
      </html>
    `);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/slack/status ─────────────────────────────────────────────────────

export async function getStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const installation = await prisma.slackInstallation.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!installation) {
      res.json({ connected: false });
      return;
    }

    res.json({
      connected: true,
      teamName: installation.teamName,
      notificationChannelId: installation.notificationChannelId || env.slack.notificationChannelId,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/slack/channels ───────────────────────────────────────────────────

export async function getChannelsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const installation = await prisma.slackInstallation.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!installation) {
      res.status(404).json({ error: "Slack is not connected" });
      return;
    }

    const token = decrypt(installation.accessToken);
    const channels = await listChannels(token);
    
    res.json({ data: channels });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/slack/channel ───────────────────────────────────────────────────

export async function selectChannelHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { channelId } = req.body;

    if (!channelId || typeof channelId !== "string") {
      res.status(400).json({ error: "channelId is required" });
      return;
    }

    const installation = await prisma.slackInstallation.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!installation) {
      res.status(404).json({ error: "Slack is not connected" });
      return;
    }

    const token = decrypt(installation.accessToken);
    
    // Validate channel
    const isValid = await validateChannel(token, channelId);
    if (!isValid) {
      res.status(400).json({ error: "Invalid channel or bot does not have access" });
      return;
    }

    // Save
    await prisma.slackInstallation.update({
      where: { id: installation.id },
      data: { notificationChannelId: channelId },
    });

    res.json({ message: "Notification channel updated", data: { channelId } });
  } catch (err) {
    next(err);
  }
}

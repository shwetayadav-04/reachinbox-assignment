import { Router } from "express";
import { google } from "googleapis";
import { env } from "../config/env";
import prisma from "../db/prisma";

const router = Router();

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/auth/google/callback"
);

// ── GET /api/auth/google ──────────────────────────────────────────────────
router.get("/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });
  res.redirect(url);
});

// ── GET /api/auth/google/callback ─────────────────────────────────────────
router.get("/google/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
    const userInfo = await oauth2.userinfo.get();
    
    if (!userInfo.data.id || !userInfo.data.email) {
      return res.status(400).send("Failed to retrieve user info from Google");
    }

    // Upsert user in the database
    const user = await prisma.user.upsert({
      where: { googleId: userInfo.data.id },
      update: {
        name: userInfo.data.name || "Unknown",
        avatarUrl: userInfo.data.picture,
        email: userInfo.data.email, // In case it changed
      },
      create: {
        googleId: userInfo.data.id,
        email: userInfo.data.email,
        name: userInfo.data.name || "Unknown",
        avatarUrl: userInfo.data.picture,
      },
    });

    // Create session
    req.session.userId = user.id;

    // Redirect to frontend dashboard
    res.redirect(`${env.frontendUrl}/scheduled`);
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.status(500).send("Authentication failed");
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  console.log("SESSION CHECK:", req.session);
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({ data: user });
  } catch (error) {
    console.error("Auth /me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.clearCookie("connect.sid", { path: "/" });
    res.json({ message: "Logged out successfully" });
  });
});

export default router;

import dotenv from "dotenv";

dotenv.config();

/**
 * Central place for all environment-variable access.
 * Fail fast at startup if required variables are missing.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Build a normalised Redis config from either:
 *   - REDIS_URL  (preferred for Redis Cloud — supports rediss:// TLS URLs)
 *   - Individual REDIS_HOST / REDIS_PORT / REDIS_USERNAME / REDIS_PASSWORD vars
 *
 * The returned object is consumed by both the shared ioredis client and the
 * BullMQ connection factory so both always use identical settings.
 */
function buildRedisConfig() {
  const url = process.env.REDIS_URL;

  if (url) {
    const parsed = new URL(url);
    const isTls = parsed.protocol === "rediss:";
    return {
      url,                                          // kept for reference
      host: parsed.hostname,
      port: parseInt(parsed.port || "6379", 10),
      username: parsed.username || "default",
      password: parsed.password || undefined,
      tls: isTls,                                   // true for rediss://
    };
  }

  // Fallback: individual environment variables (local / Redis Cloud without rediss://).
  // TLS is OFF by default. Set REDIS_TLS=true in .env to enable it explicitly.
  const host = process.env.REDIS_HOST ?? "localhost";
  const port = parseInt(process.env.REDIS_PORT ?? "6379", 10);
  const tls = process.env.REDIS_TLS === "true";

  return {
    url: undefined,
    host,
    port,
    username: process.env.REDIS_USERNAME ?? "default",
    password: process.env.REDIS_PASSWORD,
    tls,
  };
}

export const env = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  databaseUrl: requireEnv("DATABASE_URL"),
  redis: buildRedisConfig(),
  smtp: {
    host: requireEnv("ETHEREAL_HOST"),
    port: parseInt(process.env.ETHEREAL_PORT ?? "587", 10),
    user: requireEnv("ETHEREAL_USER"),
    password: requireEnv("ETHEREAL_PASSWORD"),
    from: requireEnv("ETHEREAL_FROM"),
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10),
  },
  rateLimit: {
    minDelaySeconds: parseInt(process.env.MIN_EMAIL_DELAY_SECONDS ?? "10", 10),
    maxPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR ?? "50", 10),
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    redirectUri: process.env.SLACK_REDIRECT_URI ?? "http://localhost:3001/api/slack/oauth/callback",
    notificationChannelId: process.env.SLACK_NOTIFICATION_CHANNEL_ID,
    tokenEncryptionKey: process.env.SLACK_TOKEN_ENCRYPTION_KEY,
  },
  sessionSecret: process.env.SESSION_SECRET || "default_development_secret_do_not_use_in_prod",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
} as const;

// Validate encryption key if provided
if (env.slack.tokenEncryptionKey) {
  const keyBuf = Buffer.from(env.slack.tokenEncryptionKey, "utf-8"); // Assume utf-8 string for simplicity, or could be hex
  // We'll just enforce length 32 if decoded as utf-8, or we can enforce 64 for hex.
  // Let's enforce that it's 32 bytes.
  let isValid = false;
  if (Buffer.from(env.slack.tokenEncryptionKey, "hex").length === 32) isValid = true;
  else if (Buffer.from(env.slack.tokenEncryptionKey, "base64").length === 32) isValid = true;
  else if (Buffer.from(env.slack.tokenEncryptionKey, "utf-8").length === 32) isValid = true;
  
  if (!isValid) {
    throw new Error("SLACK_TOKEN_ENCRYPTION_KEY must be a valid 32-byte key (hex, base64, or utf-8) for AES-256-GCM");
  }
}

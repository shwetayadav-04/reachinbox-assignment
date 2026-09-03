import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import { env } from "./config/env";
import router from "./routes";
import authRouter from "./routes/auth";
import searchRouter from "./routes/searchRoutes";
import queueRouter from "./routes/queueRoutes";
import { errorHandler } from "./middleware/errorHandler";
import prisma from "./db/prisma";
import redisClient from "./config/redis";
import { emailQueue } from "./queue/emailQueue";

const app = express();
const PgSession = connectPgSimple(session);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgSession({
      conObject: {
        connectionString: env.databaseUrl,
      },
      createTableIfMissing: true,
    }),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    },
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/search", searchRouter);
app.use("/api/queue", queueRouter);
app.use("/", router);

// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ── Server startup ────────────────────────────────────────────────────────────
const server = app.listen(env.port, () => {
  console.log(`🚀 Server running on http://localhost:${env.port}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// SIGTERM is sent by Docker / Kubernetes on container stop.
// SIGINT is sent by Ctrl+C in local development.
async function shutdown(signal: string): Promise<void> {
  console.log(`\n⚠️  Received ${signal}. Shutting down gracefully…`);

  // Stop accepting new HTTP requests
  server.close(async () => {
    try {
      await emailQueue.close();
      await prisma.$disconnect();
      redisClient.disconnect();
      console.log("✅ Cleanup complete. Exiting.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error during shutdown:", err);
      process.exit(1);
    }
  });

  // Force-exit if cleanup takes longer than 10 s
  setTimeout(() => {
    console.error("❌ Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;

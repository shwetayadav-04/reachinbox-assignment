import Redis from "ioredis";
import { env } from "../config/env";

/**
 * Single shared Redis connection used for general operations (e.g. Lua rate limiter).
 * BullMQ requires its own dedicated connections — see queue/connection.ts.
 *
 * TLS is enabled automatically when env.redis.tls is true, which happens when:
 *   - REDIS_URL starts with rediss://, or
 *   - REDIS_HOST matches a known Redis Cloud hostname pattern (.redis.io etc.)
 */
const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  username: env.redis.username,
  password: env.redis.password,
  ...(env.redis.tls ? { tls: {} } : {}),
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err.message));

export default redis;


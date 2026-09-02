import { ConnectionOptions } from "bullmq";
import { env } from "../config/env";

/**
 * BullMQ requires dedicated connections — it does NOT allow sharing
 * a connection that is used for pub/sub or blocking commands elsewhere.
 * This factory creates fresh IORedis options for each Queue/Worker.
 *
 * TLS is propagated from env.redis.tls so BullMQ connections match
 * the shared client (both use TLS for Redis Cloud or neither for local).
 */
export function getBullMQConnection(): ConnectionOptions {
  return {
    host: env.redis.host,
    port: env.redis.port,
    username: env.redis.username,
    password: env.redis.password,
    maxRetriesPerRequest: null, // required by BullMQ for blocking commands
    ...(env.redis.tls ? { tls: {} } : {}),
  };
}


import redisClient from "../config/redis";
import { env } from "../config/env";

export interface RateLimitResult {
  allowed: boolean;
  nextAvailableTime: number;
  reason?: "HOURLY_LIMIT" | "MIN_DELAY";
}

/**
 * Lua script for atomic rate limiting.
 * Keys:
 *  1: hourly_key
 *  2: last_slot_key
 *  3: reservations_key
 * Args:
 *  1: jobId
 *  2: now
 *  3: minDelay
 *  4: maxPerHour
 */
const rateLimitScript = `
local hourly_key = KEYS[1]
local last_slot_key = KEYS[2]
local reservations_key = KEYS[3]

local job_id = ARGV[1]
local now = tonumber(ARGV[2])
local min_delay = tonumber(ARGV[3])
local max_per_hour = tonumber(ARGV[4])

-- Check if job already has a reservation
local existing_reservation = redis.call('HGET', reservations_key, job_id)
if existing_reservation then
    local res_time = tonumber(existing_reservation)
    if now >= res_time then
        -- We can send now
        redis.call('HDEL', reservations_key, job_id)
        return { 1, res_time }
    else
        return { 0, res_time, "MIN_DELAY" }
    end
end

-- New reservation needed. Check hourly limit first.
local current_hourly = tonumber(redis.call('GET', hourly_key) or "0")
if current_hourly >= max_per_hour then
    -- Cannot reserve in this hour. Delay to top of next hour.
    local next_hour = now + (3600000 - (now % 3600000))
    return { 0, next_hour, "HOURLY_LIMIT" }
end

-- Check last slot to calculate next available slot
local last_slot = tonumber(redis.call('GET', last_slot_key) or "0")
local next_slot = last_slot + min_delay

if next_slot < now then
    next_slot = now
end

-- Reserve the slot
redis.call('SET', last_slot_key, next_slot)
-- Increment hourly quota
redis.call('INCR', hourly_key)
if current_hourly == 0 then
    -- Set expiry for slightly longer than an hour
    redis.call('EXPIRE', hourly_key, 3600)
end

-- Save the reservation for this job
redis.call('HSET', reservations_key, job_id, next_slot)
redis.call('EXPIRE', reservations_key, 86400) -- Clean up memory after 24h

if now >= next_slot then
    redis.call('HDEL', reservations_key, job_id)
    return { 1, next_slot }
else
    return { 0, next_slot, "MIN_DELAY" }
end
`;

// Define a command inside ioredis to execute our script
redisClient.defineCommand("checkRateLimit", {
  numberOfKeys: 3,
  lua: rateLimitScript,
});

export async function checkSenderRateLimit(senderId: string, jobId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const date = new Date(now);
  const hourString = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCHours()}`;

  const hourlyKey = `rate_limit:${senderId}:${hourString}`;
  const lastSlotKey = `last_slot:${senderId}`;
  const reservationsKey = `reservations:${senderId}`;

  const minDelayMs = env.rateLimit.minDelaySeconds * 1000;
  
  // Custom command type override
  const result = await (redisClient as any).checkRateLimit(
    hourlyKey,
    lastSlotKey,
    reservationsKey,
    jobId,
    now.toString(),
    minDelayMs.toString(),
    env.rateLimit.maxPerHour.toString()
  );

  return {
    allowed: result[0] === 1,
    nextAvailableTime: result[1],
    reason: result[2] ? (result[2] as "HOURLY_LIMIT" | "MIN_DELAY") : undefined,
  };
}

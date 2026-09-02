import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits is standard for GCM
const AUTH_TAG_LENGTH = 16;

export function encrypt(text: string): string {
  if (!env.slack.tokenEncryptionKey) {
    throw new Error("SLACK_TOKEN_ENCRYPTION_KEY is required for encryption");
  }

  // Key is 32 bytes (validated in env.ts)
  const key = Buffer.from(env.slack.tokenEncryptionKey, "utf-8"); // Assume UTF-8 string, or base64/hex depending on env.ts
  const encryptionKey = key.length === 32 ? key : Buffer.from(env.slack.tokenEncryptionKey, "hex"); // fallback for hex
  // Re-evaluating the key: if the user provided it as a raw string it might be utf-8, but let's safely parse it.
  let validKey = Buffer.alloc(32);
  if (Buffer.from(env.slack.tokenEncryptionKey, "hex").length === 32) {
    validKey = Buffer.from(env.slack.tokenEncryptionKey, "hex");
  } else if (Buffer.from(env.slack.tokenEncryptionKey, "base64").length === 32) {
    validKey = Buffer.from(env.slack.tokenEncryptionKey, "base64");
  } else if (Buffer.from(env.slack.tokenEncryptionKey, "utf-8").length === 32) {
    validKey = Buffer.from(env.slack.tokenEncryptionKey, "utf-8");
  } else {
    throw new Error("Invalid encryption key length");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, validKey, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!env.slack.tokenEncryptionKey) {
    throw new Error("SLACK_TOKEN_ENCRYPTION_KEY is required for decryption");
  }

  let validKey = Buffer.alloc(32);
  if (Buffer.from(env.slack.tokenEncryptionKey, "hex").length === 32) {
    validKey = Buffer.from(env.slack.tokenEncryptionKey, "hex");
  } else if (Buffer.from(env.slack.tokenEncryptionKey, "base64").length === 32) {
    validKey = Buffer.from(env.slack.tokenEncryptionKey, "base64");
  } else if (Buffer.from(env.slack.tokenEncryptionKey, "utf-8").length === 32) {
    validKey = Buffer.from(env.slack.tokenEncryptionKey, "utf-8");
  } else {
    throw new Error("Invalid decryption key length");
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encryptedData = Buffer.from(parts[2], "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, validKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

import { PrismaClient } from "@prisma/client";

/**
 * Single shared Prisma client instance.
 * Re-using one client avoids exhausting the connection pool.
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

export default prisma;

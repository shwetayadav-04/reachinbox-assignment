/**
 * Payload stored in each BullMQ email job.
 *
 * We only store the DB id here — the worker fetches the full email record
 * from PostgreSQL. This keeps the queue payload small and means the worker
 * always uses the latest DB state (important for idempotency checks).
 */
export interface EmailJobData {
  emailId: string;
  senderId: string;
}

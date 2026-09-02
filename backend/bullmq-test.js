const { Queue, Worker, Job, DelayedError } = require("bullmq");
const connection = { host: "localhost", port: 6379, password: "reachinbox_redis_secret" };
const q = new Queue("test-q", { connection });
const w = new Worker("test-q", async (job) => {
  console.log("processing job", job.id);
  if (job.attemptsMade === 0) {
    console.log("delaying...");
    await job.moveToDelayed(Date.now() + 2000, job.token);
    throw new DelayedError();
  }
  console.log("done!");
}, { connection });
async function run() {
  await q.drain();
  await q.add("test", {}, { jobId: "my-job" });
  setTimeout(() => process.exit(0), 4000);
}
run();

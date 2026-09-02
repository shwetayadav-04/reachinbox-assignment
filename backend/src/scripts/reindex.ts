import { PrismaClient } from "@prisma/client";
import { indexEmail, createIndexIfNeeded } from "../services/elasticsearchService";

const prisma = new PrismaClient();

async function reindex() {
  console.log("Starting Elasticsearch reindex...");
  try {
    await createIndexIfNeeded();

    const emails = await prisma.email.findMany({
      include: {
        sender: true,
      },
    });

    console.log(`Found ${emails.length} emails in PostgreSQL.`);

    let indexedCount = 0;
    let errorCount = 0;
    for (const email of emails) {
      const success = await indexEmail(email, email.sender?.email);
      if (success) {
        indexedCount++;
      } else {
        errorCount++;
      }
    }

    console.log(`Successfully indexed ${indexedCount} documents.`);
    if (errorCount > 0) {
      console.log(`Encountered ${errorCount} indexing errors.`);
    }
  } catch (err) {
    console.error("Reindex failed:", err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reindex();

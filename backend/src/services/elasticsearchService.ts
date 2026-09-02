import { Client } from "@elastic/elasticsearch";
import { Email, EmailStatus } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

// Create the client (will fail gracefully in methods if unavailable)
export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

const indexName = process.env.ELASTICSEARCH_INDEX || "emails";

/**
 * Initializes the Elasticsearch index with appropriate mappings.
 */
export async function createIndexIfNeeded() {
  try {
    const exists = await esClient.indices.exists({ index: indexName });
    if (!exists) {
      await esClient.indices.create({
        index: indexName,
        mappings: {
          properties: {
            id: { type: "keyword" },
            recipient: { type: "text", analyzer: "standard" },
            subject: { type: "text", analyzer: "standard" },
            body: { type: "text", analyzer: "standard" },
            senderId: { type: "keyword" }, // Maps to Sender ID
            senderEmail: { type: "text", analyzer: "standard" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
            createdAt: { type: "date" },
            updatedAt: { type: "date" },
          },
        },
      } as any); // using 'any' to bypass strict @elastic/elasticsearch type enforcement mismatch
      console.log(`[Elasticsearch] Created index '${indexName}'`);
    }
  } catch (error) {
    console.error("[Elasticsearch] Failed to create index:", error);
  }
}

/**
 * Indexes a new email into Elasticsearch.
 * @returns true if successful, false otherwise
 */
export async function indexEmail(email: Email, senderEmail?: string): Promise<boolean> {
  try {
    await esClient.index({
      index: indexName,
      id: email.id,
      document: {
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        senderId: email.senderId,
        senderEmail: senderEmail || "",
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt,
        createdAt: email.createdAt,
        updatedAt: email.updatedAt,
      },
    });
    console.log(`[Elasticsearch] Indexed email ${email.id}`);
    return true;
  } catch (error) {
    console.error(`[Elasticsearch] Indexing failed for ${email.id}:`, error);
    return false;
  }
}

/**
 * Updates an existing email document in Elasticsearch (e.g., status change).
 */
export async function updateEmail(id: string, doc: Partial<Email>) {
  try {
    await esClient.update({
      index: indexName,
      id: id,
      doc: doc,
    });
    console.log(`[Elasticsearch] Updated email ${id}`);
  } catch (error: any) {
    // If document doesn't exist, it might not be indexed yet; ignore or log gracefully
    if (error.meta && error.meta.statusCode === 404) {
      console.warn(`[Elasticsearch] Update skipped, document ${id} not found.`);
    } else {
      console.error(`[Elasticsearch] Update failed for ${id}:`, error);
    }
  }
}

/**
 * Deletes an email document from Elasticsearch.
 */
export async function deleteEmail(id: string) {
  try {
    await esClient.delete({
      index: indexName,
      id: id,
    });
    console.log(`[Elasticsearch] Deleted email ${id}`);
  } catch (error) {
    console.error(`[Elasticsearch] Delete failed for ${id}:`, error);
  }
}

/**
 * Searches emails with a fuzzy multi-match query.
 */
export async function searchEmails(query: string, status?: EmailStatus, page = 1, limit = 20) {
  try {
    const from = (page - 1) * limit;

    const body: any = {
      from,
      size: limit,
      query: {
        bool: {
          must: [],
        },
      },
      sort: [
        { scheduledAt: { order: "asc" } },
      ],
    };

    if (query && query.trim() !== "") {
      body.query.bool.must.push({
        multi_match: {
          query: query,
          fields: ["subject^2", "body", "recipient", "senderEmail"],
          fuzziness: "AUTO",
        },
      });
    } else {
      body.query.bool.must.push({
        match_all: {},
      });
    }

    if (status) {
      body.query.bool.filter = [
        {
          term: { status: status },
        },
      ];
    }

    const response = await esClient.search({
      index: indexName,
      body: body,
    });

    const hits = response.hits.hits;
    const total = typeof response.hits.total === "number" ? response.hits.total : response.hits.total?.value || 0;

    const data = hits.map((hit: any) => hit._source);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("[Elasticsearch] Search failed:", error);
    throw new Error("Search service unavailable");
  }
}

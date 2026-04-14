import app from "./app";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function ensureSchema() {
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen BIGINT`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS rating INT`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS response_time_ms BIGINT`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS typing_user_id TEXT`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS typing_at BIGINT`,
  ];
  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err) {
      logger.warn({ err, sql }, "Schema migration failed (non-fatal)");
    }
  }
}

async function cleanupBlobUris() {
  try {
    // Remove messages whose image or audio URI is a browser blob: URL —
    // those URLs are session-scoped and can never be loaded again.
    const result = await pool.query(
      `DELETE FROM messages
       WHERE (image_uri IS NOT NULL AND image_uri LIKE 'blob:%')
          OR (audio_uri IS NOT NULL AND audio_uri LIKE 'blob:%')`
    );
    if (result.rowCount && result.rowCount > 0) {
      logger.info({ removed: result.rowCount }, "Removed stale blob: messages");
    }
  } catch (err) {
    logger.warn({ err }, "Could not clean up blob: messages (non-fatal)");
  }
}

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server keeps running");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — server keeps running");
});

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await ensureSchema();
  await cleanupBlobUris();
});

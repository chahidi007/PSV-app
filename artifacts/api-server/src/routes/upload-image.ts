import { Router } from "express";
import { pool } from "@workspace/db";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();
const UPLOAD_DIR = "/tmp/phytoclinic-uploads";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

pool.query(`
  CREATE TABLE IF NOT EXISTS photos (
    id          TEXT PRIMARY KEY,
    user_id     TEXT,
    conversation_id TEXT,
    filename    TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    url         TEXT NOT NULL,
    created_at  BIGINT NOT NULL
  )
`).catch(() => {});

router.post("/upload-image", async (req, res) => {
  try {
    const { imageBase64, mimeType, userId, conversationId } = req.body as {
      imageBase64: string;
      mimeType?: string;
      userId?: string;
      conversationId?: string;
    };

    if (!imageBase64 || imageBase64.length < 100) {
      res.status(400).json({ error: "Image manquante ou invalide" });
      return;
    }

    const ext = MIME_TO_EXT[mimeType ?? "image/jpeg"] ?? "jpg";
    const photoId = crypto.randomUUID();
    const filename = `${photoId}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > 8 * 1024 * 1024) {
      res.status(413).json({ error: "Image trop grande (max 8 MB)" });
      return;
    }

    fs.writeFileSync(filePath, buffer);

    const url = `/api/images/${filename}`;
    const now = Date.now();

    await pool.query(
      `INSERT INTO photos (id, user_id, conversation_id, filename, mime_type, url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [photoId, userId ?? null, conversationId ?? null, filename, mimeType ?? "image/jpeg", url, now]
    );

    res.json({ photoId, url, filename });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Server error" });
  }
});

router.get("/images/:filename", (req, res) => {
  const { filename } = req.params;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Image introuvable" });
    return;
  }

  const ext = path.extname(filename).slice(1).toLowerCase();
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg",
    png: "image/png", webp: "image/webp", gif: "image/gif",
  };

  res.setHeader("Content-Type", mimeMap[ext] ?? "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(filePath, { root: "/" });
});

router.get("/photos/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const r = await pool.query(
      `SELECT id, user_id, conversation_id, url, mime_type, created_at
       FROM photos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId]
    );
    res.json(r.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      url: row.url,
      mimeType: row.mime_type,
      createdAt: Number(row.created_at),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

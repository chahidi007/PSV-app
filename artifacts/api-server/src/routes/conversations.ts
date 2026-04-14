import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/conversations", async (req, res) => {
  try {
    const { userId, role } = req.query;
    if (!userId) return res.status(400).json({ error: "userId مطلوب" });
    let rows;
    if (role === "expert") {
      const r = await pool.query(
        `SELECT * FROM conversations WHERE expert_id = $1
         ORDER BY COALESCE(last_message_time, created_at) DESC`,
        [userId]
      );
      rows = r.rows;
    } else {
      const r = await pool.query(
        `SELECT * FROM conversations WHERE client_id = $1
         ORDER BY COALESCE(last_message_time, created_at) DESC`,
        [userId]
      );
      rows = r.rows;
    }
    res.json(rows.map(toConv));
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const { id, clientId, clientName, expertId, expertName, expertSpecialty, title, issue, thumbnailUri } = req.body;
    if (!id || !clientId || !title || !issue) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }
    const now = Date.now();
    await pool.query(
      `INSERT INTO conversations
       (id, client_id, client_name, expert_id, expert_name, expert_specialty, title, issue, status, thumbnail_uri, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,$10)`,
      [id, clientId, clientName, expertId ?? null, expertName ?? null, expertSpecialty ?? null, title, issue, thumbnailUri ?? null, now]
    );
    const r = await pool.query("SELECT * FROM conversations WHERE id = $1", [id]);
    res.status(201).json(toConv(r.rows[0]));
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (updates.status !== undefined) { fields.push(`status = $${i++}`); values.push(updates.status); }
    if (updates.lastMessage !== undefined) { fields.push(`last_message = $${i++}`); values.push(updates.lastMessage); }
    if (updates.lastMessageTime !== undefined) { fields.push(`last_message_time = $${i++}`); values.push(updates.lastMessageTime); }
    if (updates.lastMessageType !== undefined) { fields.push(`last_message_type = $${i++}`); values.push(updates.lastMessageType); }
    if (updates.unreadCount !== undefined) { fields.push(`unread_count = $${i++}`); values.push(updates.unreadCount); }
    if (updates.expertId !== undefined) { fields.push(`expert_id = $${i++}`); values.push(updates.expertId); }
    if (updates.expertName !== undefined) { fields.push(`expert_name = $${i++}`); values.push(updates.expertName); }
    if (!fields.length) return res.status(400).json({ error: "لا توجد تحديثات" });
    values.push(id);
    await pool.query(`UPDATE conversations SET ${fields.join(", ")} WHERE id = $${i}`, values);
    const r = await pool.query("SELECT * FROM conversations WHERE id = $1", [id]);
    res.json(toConv(r.rows[0]));
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/conversations/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE conversations SET unread_count = 0 WHERE id = $1", [id]);
    await pool.query("UPDATE messages SET is_read = TRUE WHERE conversation_id = $1", [id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const since = req.query.since ? Number(req.query.since) : null;
    let r;
    if (since && !isNaN(since)) {
      r = await pool.query(
        "SELECT * FROM messages WHERE conversation_id = $1 AND timestamp > $2 ORDER BY timestamp ASC",
        [id, since]
      );
    } else {
      r = await pool.query(
        "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC",
        [id]
      );
    }
    res.json(r.rows.map(toMsg));
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/messages", async (req, res) => {
  try {
    const { id, conversationId, senderId, senderName, senderRole, type, content, imageUri, audioUri, audioDuration, videoUri, timestamp } = req.body;
    if (!id || !conversationId || !senderId || !type) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }
    await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, sender_name, sender_role, type, content, image_uri, audio_uri, audio_duration, video_uri, is_read, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE,$12)`,
      [id, conversationId, senderId, senderName, senderRole, type, content ?? "", imageUri ?? null, audioUri ?? null, audioDuration ?? null, videoUri ?? null, timestamp ?? Date.now()]
    );
    const lastText = type === "image" ? "صورة مشتركة" : type === "audio" ? "رسالة صوتية" : type === "video" ? "فيديو مشترك" : content;
    await pool.query(
      `UPDATE conversations SET last_message = $1, last_message_time = $2, last_message_type = $3, status = 'in_progress',
       unread_count = unread_count + 1 WHERE id = $4`,
      [lastText, timestamp ?? Date.now(), type, conversationId]
    );
    const r = await pool.query("SELECT * FROM messages WHERE id = $1", [id]);
    res.status(201).json(toMsg(r.rows[0]));

    // Send push notification to the recipient (fire-and-forget, non-blocking)
    sendPushNotification({ conversationId, senderId, senderName, senderRole, type, content }).catch(() => {});
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

async function sendPushNotification({ conversationId, senderId, senderName, senderRole, type, content }: {
  conversationId: string; senderId: string; senderName: string;
  senderRole: string; type: string; content: string;
}) {
  const convResult = await pool.query("SELECT * FROM conversations WHERE id = $1", [conversationId]);
  if (!convResult.rows.length) return;
  const conv = convResult.rows[0];
  // Determine the recipient: if sender is the client, notify the expert; otherwise notify the client
  const recipientId = senderRole === "client" ? conv.expert_id : conv.client_id;
  if (!recipientId) return;
  const tokenResult = await pool.query("SELECT push_token FROM users WHERE id = $1", [recipientId]);
  if (!tokenResult.rows.length || !tokenResult.rows[0].push_token) return;
  const pushToken = tokenResult.rows[0].push_token;
  const body = type === "image" ? "📷 صورة مشتركة" : type === "audio" ? "🎤 رسالة صوتية" : type === "video" ? "🎥 فيديو مشترك" : content;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Encoding": "gzip, deflate" },
    body: JSON.stringify({
      to: pushToken,
      title: senderName,
      body,
      sound: "default",
      data: { conversationId },
    }),
  });
}

function toConv(row: any) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    expertId: row.expert_id,
    expertName: row.expert_name,
    expertSpecialty: row.expert_specialty,
    title: row.title,
    issue: row.issue,
    status: row.status,
    thumbnailUri: row.thumbnail_uri,
    lastMessage: row.last_message,
    lastMessageTime: row.last_message_time ? Number(row.last_message_time) : undefined,
    lastMessageType: row.last_message_type,
    unreadCount: row.unread_count ?? 0,
    createdAt: Number(row.created_at),
    rating: row.rating ?? null,
    responseTimeMs: row.response_time_ms ? Number(row.response_time_ms) : null,
    typingUserId: row.typing_user_id ?? null,
    typingAt: row.typing_at ? Number(row.typing_at) : null,
  };
}

function toMsg(row: any) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    type: row.type,
    content: row.content ?? "",
    imageUri: row.image_uri,
    audioUri: row.audio_uri,
    audioDuration: row.audio_duration,
    videoUri: row.video_uri,
    isRead: row.is_read,
    timestamp: Number(row.timestamp),
  };
}

// Delete a conversation and all its messages
router.delete("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM messages WHERE conversation_id = $1", [id]);
    await pool.query("DELETE FROM conversations WHERE id = $1", [id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Typing indicator
router.put("/conversations/:id/typing", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId مطلوب" });
    await pool.query(
      `UPDATE conversations SET typing_user_id = $1, typing_at = $2 WHERE id = $3`,
      [userId, Date.now(), req.params.id]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Rate a resolved conversation (1-5 stars)
router.put("/conversations/:id/rating", async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و5" });
    }
    await pool.query(
      `UPDATE conversations SET rating = $1 WHERE id = $2`,
      [rating, req.params.id]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;

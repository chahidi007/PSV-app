import { Router } from "express";
import { pool, db, expertsTable } from "@workspace/db";

const router = Router();

const DEFAULT_KEY = "phytoclinic-internal-sync-2024";

router.post("/internal/sync-user", async (req, res) => {
  const key = req.headers["x-internal-key"];
  const expectedKey = process.env.INTERNAL_API_KEY ?? DEFAULT_KEY;

  if (!key || key !== expectedKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id, name, role, phone, password_hash, specialty, location, google_id } = req.body;

  if (!id || !name || !role || !phone) {
    res.status(400).json({ error: "Missing required fields: id, name, role, phone" });
    return;
  }

  if (!["client", "expert"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO users (id, name, role, phone, password_hash, specialty, location, google_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name        = EXCLUDED.name,
         role        = EXCLUDED.role,
         phone       = EXCLUDED.phone,
         password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
         specialty   = EXCLUDED.specialty,
         location    = EXCLUDED.location,
         google_id   = COALESCE(EXCLUDED.google_id, users.google_id)`,
      [id, name, role, phone, password_hash ?? null, specialty ?? null, location ?? null, google_id ?? null]
    );

    if (role === "expert") {
      await db.insert(expertsTable).values({
        id,
        name,
        specialty: specialty ?? "",
        location: location ?? "",
        isActive: true,
      }).onConflictDoNothing();
    }

    res.json({ ok: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Server error" });
  }
});

export default router;

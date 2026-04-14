import { Router, type IRouter } from "express";
import { db, expertsTable, pool } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const ADMIN_KEY = process.env.ADMIN_SECRET ?? "Thd5yimo";

function requireAdmin(req: any, res: any, next: any) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "غير مصرح" });
  }
  next();
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function generateUserId(): string {
  return `u-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * GET /api/experts
 * Returns expert profiles available for farmers to consult.
 * Single source of truth: the admin-managed experts table.
 * IDs in this table always equal the corresponding user account IDs
 * because both are created together with the same generated ID.
 */
router.get("/experts", async (_req, res) => {
  try {
    const experts = await db
      .select()
      .from(expertsTable)
      .orderBy(expertsTable.createdAt);
    res.json(experts);
  } catch (err) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

/**
 * POST /api/experts (admin-only)
 * Creates an expert profile AND a matching user account so the expert can log in.
 * The user ID becomes the canonical expert ID stored in conversations.
 */
router.post("/experts", requireAdmin, async (req, res) => {
  try {
    const { name, specialty, location, phone, password } = req.body;
    if (!name || !specialty || !location) {
      return res.status(400).json({ error: "الاسم والتخصص والموقع مطلوبة" });
    }

    // Generate a single ID used in BOTH tables — so expert_id in conversations
    // always equals the user's profile.id when they log in.
    const userId = generateUserId();

    // Create user account if phone + password provided
    if (phone && password) {
      // Check phone not already taken
      const existing = await pool.query(
        "SELECT id FROM users WHERE phone = $1", [phone]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "رقم الهاتف مسجل بالفعل" });
      }
      const salt = generateSalt();
      const passwordHash = `${salt}:${hashPassword(password, salt)}`;
      await pool.query(
        `INSERT INTO users (id, name, role, phone, password_hash, specialty, location)
         VALUES ($1, $2, 'expert', $3, $4, $5, $6)`,
        [userId, name, phone, passwordHash, specialty, location]
      );
    }

    // Create the expert profile entry (admin management)
    const [expert] = await db
      .insert(expertsTable)
      .values({ id: userId, name, specialty, location, isActive: true })
      .returning();

    res.status(201).json({ ...expert, phone: phone ?? null });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

/**
 * PUT /api/experts/:id (admin-only)
 * Updates the expert profile and syncs changes to their user account.
 */
router.put("/experts/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialty, location, isActive } = req.body;

    // Sync to users table if user account exists
    const userUpdates: string[] = [];
    const userValues: any[] = [];
    let i = 1;
    if (name !== undefined) { userUpdates.push(`name = $${i++}`); userValues.push(name); }
    if (specialty !== undefined) { userUpdates.push(`specialty = $${i++}`); userValues.push(specialty); }
    if (location !== undefined) { userUpdates.push(`location = $${i++}`); userValues.push(location); }
    if (userUpdates.length > 0) {
      userValues.push(id);
      await pool.query(
        `UPDATE users SET ${userUpdates.join(", ")} WHERE id = $${i} AND role = 'expert'`,
        userValues
      );
    }

    const [updated] = await db
      .update(expertsTable)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(specialty !== undefined ? { specialty } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(expertsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "الخبير غير موجود" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

/**
 * DELETE /api/experts/:id (admin-only)
 * Removes the expert profile and their user account.
 */
router.delete("/experts/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Remove user account too (cascades their conversations via admin.ts logic if needed)
    await pool.query("DELETE FROM users WHERE id = $1 AND role = 'expert'", [id]);
    await db.delete(expertsTable).where(eq(expertsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { db, expertsTable, pool } from "@workspace/db";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function generateId(): string {
  return `u-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

pool.query(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id);
  CREATE INDEX IF NOT EXISTS user_sessions_expires_idx ON user_sessions(expires_at);
`).catch(() => {});

pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE`).catch(() => {});

pool.query(`
  CREATE TABLE IF NOT EXISTS google_oauth_states (
    state TEXT PRIMARY KEY,
    created_at BIGINT NOT NULL,
    session_token TEXT,
    user_json TEXT,
    error TEXT
  );
`).catch(() => {});

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const API_BASE = `https://${process.env.REPLIT_DEV_DOMAIN ?? "localhost"}`;
const GOOGLE_CALLBACK_URL = `${API_BASE}/api/auth/google/callback`;

router.post("/auth/register", async (req, res) => {
  try {
    const { name, phone, password, role, specialty, location } = req.body;
    if (!name || !phone || !password || !role) {
      return res.status(400).json({ error: "الاسم والهاتف وكلمة المرور والدور مطلوبة" });
    }
    const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "رقم الهاتف مسجل بالفعل" });
    }
    const salt = generateSalt();
    const passwordHash = `${salt}:${hashPassword(password, salt)}`;
    const id = generateId();
    await pool.query(
      `INSERT INTO users (id, name, role, phone, password_hash, specialty, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, name, role, phone, passwordHash, specialty ?? null, location ?? null]
    );
    // When an expert self-registers, also create an experts table entry
    // using the SAME id so conversations correctly link to this expert.
    if (role === "expert") {
      await db.insert(expertsTable).values({
        id,
        name,
        specialty: specialty ?? "",
        location: location ?? "",
        isActive: true,
      }).onConflictDoNothing();
    }
    const sessionToken = generateSessionToken();
    const now = Date.now();
    await pool.query(
      `INSERT INTO user_sessions (token, user_id, role, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionToken, id, role, now + SESSION_TTL_MS, now]
    );
    res.status(201).json({ id, name, role, phone, specialty, location, sessionToken });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
    }
    const result = await pool.query(
      "SELECT id, name, role, phone, password_hash, specialty, location FROM users WHERE phone = $1",
      [phone]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
    }
    const user = result.rows[0];
    const [salt, hash] = user.password_hash.split(":");
    const inputHash = hashPassword(password, salt);
    if (inputHash !== hash) {
      return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
    }
    const sessionToken = generateSessionToken();
    const now = Date.now();
    await pool.query(
      `INSERT INTO user_sessions (token, user_id, role, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionToken, user.id, user.role, now + SESSION_TTL_MS, now]
    );
    res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      specialty: user.specialty,
      location: user.location,
      sessionToken,
    });
  } catch (err) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/auth/push-token", async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: "userId والرمز مطلوبان" });
    await pool.query("UPDATE users SET push_token = $1 WHERE id = $2", [token, userId]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Get user online status
router.get("/users/:id/status", async (req, res) => {
  try {
    const r = await pool.query("SELECT last_seen FROM users WHERE id = $1", [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "المستخدم غير موجود" });
    const lastSeen = r.rows[0].last_seen ? Number(r.rows[0].last_seen) : null;
    const isOnline = lastSeen !== null && Date.now() - lastSeen < 5 * 60 * 1000;
    res.json({ lastSeen, isOnline });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Heartbeat: update user's last_seen timestamp
router.put("/auth/heartbeat", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId مطلوب" });
    await pool.query("UPDATE users SET last_seen = $1 WHERE id = $2", [Date.now(), userId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// ── Server-side Google OAuth flow (works in Expo Go without proxy) ───────────

router.get("/auth/google/init", async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString("hex");
    await pool.query(
      `INSERT INTO google_oauth_states (state, created_at) VALUES ($1, $2)`,
      [state, Date.now()]
    );
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_CALLBACK_URL,
      response_type: "code",
      scope: "openid profile email",
      state,
      access_type: "offline",
      prompt: "select_account",
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, state });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.get("/auth/google/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;
  const html = (msg: string) => `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">
    <h2>${msg}</h2><p>Vous pouvez fermer cette fenêtre et retourner à l'app.</p>
    <script>setTimeout(()=>window.close(),1500)</script></body></html>`;

  if (error || !code || !state) {
    await pool.query(`UPDATE google_oauth_states SET error=$1 WHERE state=$2`, [error ?? "cancelled", state ?? ""]).catch(() => {});
    return res.send(html("❌ Connexion annulée"));
  }
  try {
    const stateRow = await pool.query(`SELECT state FROM google_oauth_states WHERE state=$1`, [state]);
    if (stateRow.rows.length === 0) return res.send(html("❌ État invalide"));

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      await pool.query(`UPDATE google_oauth_states SET error=$1 WHERE state=$2`, [tokenData.error ?? "token_error", state]);
      return res.send(html("❌ Erreur de token"));
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json() as { id: string; name: string; email?: string };
    if (!googleUser.id) {
      await pool.query(`UPDATE google_oauth_states SET error='no_user_id' WHERE state=$1`, [state]);
      return res.send(html("❌ Compte Google invalide"));
    }

    const existing = await pool.query(
      "SELECT id, name, role, phone, specialty, location FROM users WHERE google_id = $1",
      [googleUser.id]
    );
    let user: { id: string; name: string; role: string; phone: string | null; specialty?: string; location?: string };
    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else {
      const id = generateId();
      const fakePhone = `google:${googleUser.id}`;
      await pool.query(
        `INSERT INTO users (id, name, role, phone, google_id) VALUES ($1, $2, $3, $4, $5)`,
        [id, googleUser.name ?? googleUser.email ?? "Utilisateur", "client", fakePhone, googleUser.id]
      );
      user = { id, name: googleUser.name ?? googleUser.email ?? "Utilisateur", role: "client", phone: fakePhone };
    }

    const sessionToken = generateSessionToken();
    const now = Date.now();
    await pool.query(
      `INSERT INTO user_sessions (token, user_id, role, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [sessionToken, user.id, user.role, now + SESSION_TTL_MS, now]
    );
    const userJson = JSON.stringify({ id: user.id, name: user.name, role: user.role, phone: user.phone, specialty: user.specialty ?? null, location: user.location ?? null, sessionToken });
    await pool.query(`UPDATE google_oauth_states SET session_token=$1, user_json=$2 WHERE state=$3`, [sessionToken, userJson, state]);

    res.send(html("✅ Connexion réussie !"));
  } catch {
    await pool.query(`UPDATE google_oauth_states SET error='server_error' WHERE state=$1`, [state]).catch(() => {});
    res.send(html("❌ Erreur serveur"));
  }
});

router.get("/auth/google/result", async (req, res) => {
  const { state } = req.query as { state?: string };
  if (!state) return res.status(400).json({ error: "state manquant" });
  try {
    const row = await pool.query(`SELECT session_token, user_json, error FROM google_oauth_states WHERE state=$1`, [state]);
    if (row.rows.length === 0) return res.status(404).json({ status: "not_found" });
    const { session_token, user_json, error } = row.rows[0];
    if (error) return res.json({ status: "error", error });
    if (session_token && user_json) {
      await pool.query(`DELETE FROM google_oauth_states WHERE state=$1`, [state]).catch(() => {});
      return res.json({ status: "success", user: JSON.parse(user_json) });
    }
    res.json({ status: "pending" });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/auth/google", async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: "accessToken مطلوب" });

    const googleRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!googleRes.ok) return res.status(401).json({ error: "رمز Google غير صالح" });

    const googleUser = await googleRes.json() as { id: string; name: string; email?: string; picture?: string };
    if (!googleUser.id) return res.status(401).json({ error: "لم يتم التحقق من حساب Google" });

    const existing = await pool.query(
      "SELECT id, name, role, phone, specialty, location FROM users WHERE google_id = $1",
      [googleUser.id]
    );

    let user: { id: string; name: string; role: string; phone: string | null; specialty?: string; location?: string };

    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else {
      const id = generateId();
      const fakePhone = `google:${googleUser.id}`;
      await pool.query(
        `INSERT INTO users (id, name, role, phone, google_id) VALUES ($1, $2, $3, $4, $5)`,
        [id, googleUser.name, "client", fakePhone, googleUser.id]
      );
      user = { id, name: googleUser.name, role: "client", phone: fakePhone };
    }

    const sessionToken = generateSessionToken();
    const now = Date.now();
    await pool.query(
      `INSERT INTO user_sessions (token, user_id, role, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [sessionToken, user.id, user.role, now + SESSION_TTL_MS, now]
    );

    res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      specialty: user.specialty ?? null,
      location: user.location ?? null,
      sessionToken,
    });
  } catch (err) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;

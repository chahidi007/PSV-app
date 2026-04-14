import { scryptSync, randomBytes } from "node:crypto";

export interface Env {
  DB: D1Database;
  EXPRESS_API_URL: string;
  INTERNAL_API_KEY?: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  specialty: string | null;
  location: string | null;
  password_hash?: string;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, status = 200, origin = "*"): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function generateId(): string {
  return `u-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

async function syncToPostgres(
  env: Env,
  user: { id: string; name: string; phone: string; role: string; specialty?: string | null; location?: string | null; password_hash: string; }
): Promise<void> {
  const key = env.INTERNAL_API_KEY ?? "phytoclinic-internal-sync-2024";
  try {
    const res = await fetch(`${env.EXPRESS_API_URL}/api/internal/sync-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": key,
      },
      body: JSON.stringify(user),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[CF Worker] sync-user failed ${res.status}: ${body}`);
    }
  } catch (e) {
    console.error("[CF Worker] sync-user error:", e);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const path = url.pathname;

    if (path === "/api/register" && request.method === "POST") {
      return handleRegister(request, env, origin);
    }

    if (path === "/api/login" && request.method === "POST") {
      return handleLogin(request, env, origin);
    }

    if (path.startsWith("/api/user/") && request.method === "GET") {
      const id = path.replace("/api/user/", "");
      return handleGetUser(id, env, origin);
    }

    if (path === "/api/health" && request.method === "GET") {
      return json({ status: "ok", service: "phytoclinic-register", timestamp: Date.now() }, 200, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  },
};

async function handleRegister(request: Request, env: Env, origin: string): Promise<Response> {
  let body: Record<string, string>;
  try {
    body = await request.json() as Record<string, string>;
  } catch {
    return json({ error: "Corps de requête invalide" }, 400, origin);
  }

  const { name, phone, password, role, specialty, location } = body;

  if (!name || !phone || !password || !role) {
    return json({ error: "الاسم والهاتف وكلمة المرور والدور مطلوبة — Nom, téléphone, mot de passe et rôle requis" }, 400, origin);
  }

  if (phone.length < 8) {
    return json({ error: "رقم الهاتف غير صالح — Numéro de téléphone invalide" }, 400, origin);
  }

  if (password.length < 6) {
    return json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل — Mot de passe minimum 6 caractères" }, 400, origin);
  }

  if (!["client", "expert"].includes(role)) {
    return json({ error: "دور غير صالح — Rôle invalide" }, 400, origin);
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE phone = ?"
  ).bind(phone).first<{ id: string }>();

  if (existing) {
    return json({ error: "رقم الهاتف مسجل بالفعل — Ce numéro est déjà enregistré" }, 409, origin);
  }

  const salt = generateSalt();
  const passwordHash = `${salt}:${hashPassword(password, salt)}`;
  const id = generateId();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO users (id, name, phone, role, password_hash, specialty, location, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, phone, role, passwordHash, specialty ?? null, location ?? null, now).run();

  // Sync to PostgreSQL with the same id and password_hash (fire-and-forget)
  syncToPostgres(env, {
    id,
    name,
    phone,
    role,
    specialty: specialty ?? null,
    location: location ?? null,
    password_hash: passwordHash,
  });

  return json({ id, name, phone, role, specialty: specialty ?? null, location: location ?? null }, 201, origin);
}

async function handleLogin(request: Request, env: Env, origin: string): Promise<Response> {
  let body: Record<string, string>;
  try {
    body = await request.json() as Record<string, string>;
  } catch {
    return json({ error: "Corps de requête invalide" }, 400, origin);
  }

  const { phone, password } = body;

  if (!phone || !password) {
    return json({ error: "رقم الهاتف وكلمة المرور مطلوبان — Téléphone et mot de passe requis" }, 400, origin);
  }

  const user = await env.DB.prepare(
    "SELECT id, name, phone, role, specialty, location, password_hash FROM users WHERE phone = ?"
  ).bind(phone).first<User & { password_hash: string }>();

  if (!user) {
    return json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة — Identifiants incorrects" }, 401, origin);
  }

  const [salt, storedHash] = user.password_hash.split(":");
  const inputHash = hashPassword(password, salt);

  if (inputHash !== storedHash) {
    return json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة — Identifiants incorrects" }, 401, origin);
  }

  const { password_hash: _, ...safeUser } = user;
  return json(safeUser, 200, origin);
}

async function handleGetUser(id: string, env: Env, origin: string): Promise<Response> {
  if (!id || !id.startsWith("u-")) {
    return json({ error: "معرّف غير صالح — Identifiant invalide" }, 400, origin);
  }

  const user = await env.DB.prepare(
    "SELECT id, name, phone, role, specialty, location FROM users WHERE id = ?"
  ).bind(id).first<User>();

  if (!user) {
    return json({ error: "المستخدم غير موجود — Utilisateur introuvable" }, 404, origin);
  }

  return json(user, 200, origin);
}

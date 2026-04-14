import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { writeFileSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";

const router: IRouter = Router();

const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "Thd5yimo";

function isAdmin(req: any): boolean {
  return req.headers["x-admin-key"] === ADMIN_SECRET;
}

router.get("/admin/users", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "غير مصرح" });
  try {
    const result = await pool.query(
      `SELECT id, name, role, phone, specialty, location, created_at
       FROM users
       ORDER BY created_at DESC NULLS LAST, id DESC`
    );
    res.json(result.rows.map((u: any) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      phone: u.phone,
      specialty: u.specialty ?? null,
      location: u.location ?? null,
      createdAt: u.created_at ? new Date(u.created_at).getTime() : null,
    })));
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.delete("/admin/users/:id", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "غير مصرح" });
  const { id } = req.params;
  try {
    const check = await pool.query("SELECT id FROM users WHERE id = $1", [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "المستخدم غير موجود" });
    await pool.query("DELETE FROM messages WHERE sender_id = $1", [id]);
    await pool.query("DELETE FROM conversations WHERE client_id = $1", [id]);
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// GET /api/admin/conversations — all conversations, optionally filtered by ?status=pending
router.get("/admin/conversations", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "غير مصرح" });
  try {
    const { status } = req.query;
    let query: string;
    const params: any[] = [];
    if (status === "pending") {
      query = `SELECT * FROM conversations WHERE expert_id IS NULL ORDER BY created_at DESC`;
    } else {
      query = `SELECT * FROM conversations ORDER BY COALESCE(last_message_time, created_at) DESC`;
    }
    const r = await pool.query(query, params);
    res.json(r.rows.map(toConvAdmin));
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT /api/admin/conversations/:id/assign — assign expert to a conversation
router.put("/admin/conversations/:id/assign", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "غير مصرح" });
  const { id } = req.params;
  const { expertId, expertName, expertSpecialty } = req.body;
  if (!expertId) return res.status(400).json({ error: "expertId مطلوب" });
  try {
    const check = await pool.query("SELECT id FROM conversations WHERE id = $1", [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "المحادثة غير موجودة" });
    await pool.query(
      `UPDATE conversations SET expert_id = $1, expert_name = $2, expert_specialty = $3 WHERE id = $4`,
      [expertId, expertName ?? null, expertSpecialty ?? null, id]
    );
    const r = await pool.query("SELECT * FROM conversations WHERE id = $1", [id]);
    res.json(toConvAdmin(r.rows[0]));
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

function toConvAdmin(row: any) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    expertId: row.expert_id ?? null,
    expertName: row.expert_name ?? null,
    expertSpecialty: row.expert_specialty ?? null,
    title: row.title,
    issue: row.issue,
    status: row.status,
    thumbnailUri: row.thumbnail_uri ?? null,
    lastMessage: row.last_message ?? null,
    lastMessageTime: row.last_message_time ? Number(row.last_message_time) : null,
    unreadCount: row.unread_count ?? 0,
    createdAt: Number(row.created_at),
  };
}

// ── Update phyto index from ONSSA ─────────────────────────────────────────────
const ONSSA_URL = "https://eservice.onssa.gov.ma/IndPesticide.aspx";
const PHYTO_DATA_PATH = join(process.cwd(), "data", "phyto_index.json");

const COL_MAP: Record<string, string> = {
  "Produit": "produit", "Nom Produit": "produit", "Dénomination": "produit",
  "Détenteur": "detenteur", "Titulaire": "detenteur",
  "Fournisseur": "fournisseur", "Importateur": "fournisseur",
  "N° Homologation": "numHomologation", "Numéro Homologation": "numHomologation", "N°Homologation": "numHomologation",
  "Valable Jusqu'au": "valableJusquau", "Date Expiration": "valableJusquau",
  "Tableau Tox": "tableauTox", "Toxicité": "tableauTox",
  "Catégorie": "categorie", "Famille": "categorie",
  "Formulation": "formulation",
  "Matière Active": "matiereActive", "Matières Actives": "matiereActive",
  "Teneur": "teneur",
  "Usage": "usage", "Utilisation": "usage",
  "Dose": "dose", "Culture": "culture", "DAR": "dar",
  "Nombre d'Application": "nbrApplication", "Nbre Application": "nbrApplication",
};

function mapRow(row: any[], headers: string[]) {
  const entry: Record<string, string> = {
    produit: "", detenteur: "", fournisseur: "", numHomologation: "",
    valableJusquau: "", tableauTox: "", categorie: "", formulation: "",
    matiereActive: "", teneur: "", usage: "", dose: "", culture: "", dar: "", nbrApplication: "",
  };
  headers.forEach((h, i) => {
    const key = COL_MAP[h?.trim()];
    if (key && row[i] != null) entry[key] = String(row[i]).trim();
  });
  return entry;
}

router.post("/admin/update-phyto", async (req: any, res: any) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Non autorisé" });

  try {
    // Step 1: get page state
    const pageRes = await fetch(ONSSA_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });
    if (!pageRes.ok) throw new Error(`Page ONSSA: HTTP ${pageRes.status}`);

    const html = await pageRes.text();
    const cookies = pageRes.headers.get("set-cookie") ?? "";

    const extract = (name: string) => {
      const m = html.match(new RegExp(`id="${name}"[^>]*value="([^"]*)"`, "i"))
        || html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`, "i"));
      return m ? m[1] : "";
    };

    const viewState = extract("__VIEWSTATE");
    const viewStateGen = extract("__VIEWSTATEGENERATOR");
    const eventValidation = extract("__EVENTVALIDATION");

    const btnMatch = html.match(/name="([^"]*(?:Excel|Export|Xlsx|XLS|export)[^"]*)"[^>]*type="(?:submit|button|image)"/i)
      || html.match(/id="([^"]*(?:Excel|Export|Xlsx|XLS|export)[^"]*)"[^>]*/i);
    const btnName = btnMatch ? btnMatch[1] : null;

    // Step 2: download Excel
    const params = new URLSearchParams({
      __VIEWSTATE: viewState,
      __VIEWSTATEGENERATOR: viewStateGen,
      __EVENTVALIDATION: eventValidation,
      __EVENTTARGET: "",
      __EVENTARGUMENT: "",
    });
    if (btnName) params.append(btnName, "Excel");

    const dlRes = await fetch(ONSSA_URL, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": ONSSA_URL,
        "Cookie": cookies,
      },
      body: params.toString(),
    });

    if (!dlRes.ok) throw new Error(`Téléchargement Excel: HTTP ${dlRes.status}`);
    const contentType = dlRes.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      throw new Error("Le serveur a renvoyé du HTML. Le bouton Excel n'a pas pu être identifié.");
    }

    // Step 3: parse Excel → JSON
    const buffer = Buffer.from(await dlRes.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
    if (rows.length < 2) throw new Error("Fichier Excel vide ou mal formaté");

    const headers = (rows[0] as any[]).map(String);
    const data = rows.slice(1)
      .filter((row: any[]) => row.some((c: any) => c !== ""))
      .map((row: any[]) => mapRow(row, headers));

    // Step 4: save
    writeFileSync(PHYTO_DATA_PATH, JSON.stringify(data), "utf-8");
    return res.json({ success: true, count: data.length, updatedAt: new Date().toISOString() });

  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message ?? "Erreur inconnue" });
  }
});

export default router;

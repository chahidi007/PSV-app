import { Router } from "express";
import { pool } from "@workspace/db";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import {
  fetchItems,
  fetchSalesLines,
  fetchPurchaseLines,
  fetchInventoryAdjustments,
  isZohoConfigured,
} from "../lib/zoho";
import { logger } from "../lib/logger";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "",
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

async function requireExpert(req: any, res: any): Promise<{ userId: string } | null> {
  const token = req.headers["x-session-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "غير مصرح — جلسة مطلوبة" });
    return null;
  }
  try {
    const result = await pool.query(
      "SELECT user_id, role, expires_at FROM user_sessions WHERE token = $1",
      [token]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "الجلسة غير صالحة أو منتهية" });
      return null;
    }
    const session = result.rows[0];
    if (Number(session.expires_at) < Date.now()) {
      await pool.query("DELETE FROM user_sessions WHERE token = $1", [token]).catch(() => {});
      res.status(401).json({ error: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً" });
      return null;
    }
    if (session.role !== "expert") {
      res.status(403).json({ error: "هذه الميزة متاحة للخبراء فقط" });
      return null;
    }
    return { userId: session.user_id };
  } catch (err: any) {
    logger.error({ err }, "requireExpert session check failed");
    res.status(500).json({ error: "خطأ في التحقق من الجلسة" });
    return null;
  }
}

function ensureTables() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS zoho_stock_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT,
      unit TEXT,
      description TEXT,
      current_stock NUMERIC DEFAULT 0,
      reorder_level NUMERIC,
      zoho_item_id TEXT UNIQUE,
      ai_suggested_level NUMERIC,
      ai_reorder_threshold NUMERIC,
      ai_trend TEXT,
      ai_reasoning TEXT,
      ai_analyzed_at BIGINT,
      synced_at BIGINT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    );

    CREATE TABLE IF NOT EXISTS zoho_stock_entries (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES zoho_stock_items(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      note TEXT,
      created_by TEXT,
      created_at BIGINT NOT NULL
    );

    ALTER TABLE zoho_stock_entries ADD COLUMN IF NOT EXISTS zoho_tx_key TEXT;

    CREATE INDEX IF NOT EXISTS zoho_stock_entries_item_idx ON zoho_stock_entries(item_id);
    CREATE INDEX IF NOT EXISTS zoho_stock_entries_created_idx ON zoho_stock_entries(created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS zoho_stock_entries_tx_key_idx ON zoho_stock_entries(zoho_tx_key)
      WHERE zoho_tx_key IS NOT NULL;

    CREATE TABLE IF NOT EXISTS zoho_sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT INTO zoho_sync_meta (key, value)
    VALUES ('last_transactions_synced_at', '0')
    ON CONFLICT (key) DO NOTHING;
  `);
}

ensureTables().catch((err) => {
  logger.warn({ err }, "zoho_stock tables setup failed (non-fatal)");
});

function generateId(): string {
  return `zsi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function entryId(): string {
  return `zse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function runAiAnalysis(
  itemId: string,
  itemName: string,
  currentStock: number,
  unit: string | null,
  reorderLevel: number | null,
  lang: string
): Promise<void> {
  const entriesRow = await pool.query(
    `SELECT source, quantity, note, created_at
     FROM zoho_stock_entries
     WHERE item_id = $1
     ORDER BY created_at ASC
     LIMIT 90`,
    [itemId]
  );

  if (entriesRow.rows.length === 0) return;

  const history = entriesRow.rows.map((e: any) => ({
    source: e.source,
    quantity: Number(e.quantity),
    note: e.note ?? undefined,
    date: new Date(Number(e.created_at)).toISOString().split("T")[0],
  }));

  const isAr = lang !== "fr";
  const systemPrompt = isAr
    ? `أنت محلل مخزون متخصص في المنتجات الزراعية. مهمتك تحليل سجل المعاملات لمنتج معين واقتراح مستوى المخزون المثالي وعتبة إعادة الطلب. أجب دائماً بتنسيق JSON فقط.`
    : `Tu es un analyste de stock spécialisé en produits agricoles. Ton rôle est d'analyser l'historique des transactions pour un produit donné et de suggérer un niveau de stock optimal et un seuil de réapprovisionnement. Réponds uniquement en JSON.`;

  const unitStr = unit ?? "";
  const reorderStr = reorderLevel != null ? String(reorderLevel) : (isAr ? "غير محددة" : "non défini");

  const userPrompt = isAr
    ? `منتج: "${itemName}"
المخزون الحالي: ${currentStock} ${unitStr}
عتبة إعادة الطلب من Zoho: ${reorderStr}
سجل المعاملات (${history.length} إدخال) — المصادر: zoho_sync=مخزون فوري من Zoho، zoho_sale=مبيعات فواتير، zoho_purchase=أوامر شراء، zoho_adjustment=تعديلات مخزون، team_input=إدخال يدوي الفريق:
${JSON.stringify(history, null, 2)}

بناءً على المبيعات والمشتريات والتعديلات، حلل اتجاه الاستهلاك وأعطِ توصية:
{"suggestedLevel":150,"reorderThreshold":50,"trend":"stable","reasoning":"شرح 2-3 جمل"}
- trend: "stable" أو "increasing" أو "decreasing"`
    : `Produit : "${itemName}"
Stock actuel : ${currentStock} ${unitStr}
Seuil de réapprovisionnement Zoho : ${reorderStr}
Historique des transactions (${history.length} entrées) — sources : zoho_sync=stock Zoho en temps réel, zoho_sale=factures ventes, zoho_purchase=bons commande achats, zoho_adjustment=ajustements inventaire, team_input=saisie manuelle équipe :
${JSON.stringify(history, null, 2)}

En analysant les ventes, achats et ajustements, détermine la tendance de consommation et réponds uniquement en JSON :
{"suggestedLevel":150,"reorderThreshold":50,"trend":"stable","reasoning":"Explication 2-3 phrases"}
- trend: "stable" | "increasing" | "decreasing"`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") return;

  let raw = block.text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();

  const parsed = JSON.parse(raw) as {
    suggestedLevel: number;
    reorderThreshold: number;
    trend: string;
    reasoning: string;
  };

  const now = Date.now();
  await pool.query(
    `UPDATE zoho_stock_items
     SET ai_suggested_level = $1, ai_reorder_threshold = $2,
         ai_trend = $3, ai_reasoning = $4, ai_analyzed_at = $5
     WHERE id = $6`,
    [parsed.suggestedLevel, parsed.reorderThreshold, parsed.trend, parsed.reasoning, now, itemId]
  );
}

router.get("/zoho-stock/items", async (req, res) => {
  if (!await requireExpert(req, res)) return;
  // session verified — userId available if needed
  try {
    const r = await pool.query(`SELECT * FROM zoho_stock_items ORDER BY name ASC`);
    res.json(r.rows.map(mapItem));
  } catch (err: any) {
    logger.error({ err }, "zoho-stock/items GET failed");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.get("/zoho-stock/items/:id/history", async (req, res) => {
  if (!await requireExpert(req, res)) return;
  try {
    const r = await pool.query(
      `SELECT * FROM zoho_stock_entries WHERE item_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(r.rows.map(mapEntry));
  } catch (err: any) {
    logger.error({ err }, "zoho-stock/items/:id/history GET failed");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/zoho-stock/sync", async (req, res) => {
  if (!await requireExpert(req, res)) return;

  if (!isZohoConfigured()) {
    return res.status(503).json({
      error:
        "Zoho Books not configured. Please set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORGANIZATION_ID secrets.",
    });
  }

  const lang: string = (req.body?.lang as string) ?? "ar";

  try {
    const now = Date.now();
    const todayStr = new Date(now).toISOString().split("T")[0];

    const metaRow = await pool.query(
      `SELECT value FROM zoho_sync_meta WHERE key = 'last_transactions_synced_at'`
    );
    const lastSyncedAt = metaRow.rows.length > 0 ? Number(metaRow.rows[0].value) : 0;
    const defaultWindow = now - 90 * 24 * 60 * 60 * 1000;
    const fromTimestamp = lastSyncedAt > 0 ? lastSyncedAt : defaultWindow;
    const fromDate = new Date(fromTimestamp).toISOString().split("T")[0];

    const [zohoItems, salesLines, purchaseLines, adjustmentLines] = await Promise.all([
      fetchItems(),
      fetchSalesLines(fromDate).catch((err) => {
        logger.warn({ err }, "fetchSalesLines failed — skipping");
        return [];
      }),
      fetchPurchaseLines(fromDate).catch((err) => {
        logger.warn({ err }, "fetchPurchaseLines failed — skipping");
        return [];
      }),
      fetchInventoryAdjustments(fromDate).catch((err) => {
        logger.warn({ err }, "fetchInventoryAdjustments failed — skipping");
        return [];
      }),
    ]);

    const zohoIdToDbId: Map<string, string> = new Map();

    for (const item of zohoItems) {
      const existing = await pool.query(
        `SELECT id FROM zoho_stock_items WHERE zoho_item_id = $1`,
        [item.item_id]
      );
      if (existing.rows.length > 0) {
        const dbId: string = existing.rows[0].id;
        zohoIdToDbId.set(item.item_id, dbId);
        await pool.query(
          `UPDATE zoho_stock_items
           SET name = $1, sku = $2, unit = $3, description = $4,
               current_stock = $5, reorder_level = $6, synced_at = $7
           WHERE zoho_item_id = $8`,
          [
            item.name,
            item.sku ?? null,
            item.unit ?? null,
            item.description ?? null,
            item.stock_on_hand,
            item.reorder_level ?? null,
            now,
            item.item_id,
          ]
        );
        const syncTxKey = `sync:${item.item_id}:${todayStr}`;
        await pool.query(
          `INSERT INTO zoho_stock_entries (id, item_id, source, quantity, note, zoho_tx_key, created_at)
           VALUES ($1, $2, 'zoho_sync', $3, $4, $5, $6)
           ON CONFLICT (zoho_tx_key) WHERE zoho_tx_key IS NOT NULL DO NOTHING`,
          [
            entryId(),
            dbId,
            item.stock_on_hand,
            `Zoho sync — stock: ${item.stock_on_hand} ${item.unit ?? ""}`.trim(),
            syncTxKey,
            now,
          ]
        );
      } else {
        const newId = generateId();
        zohoIdToDbId.set(item.item_id, newId);
        await pool.query(
          `INSERT INTO zoho_stock_items
             (id, name, sku, unit, description, current_stock, reorder_level, zoho_item_id, synced_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
          [
            newId,
            item.name,
            item.sku ?? null,
            item.unit ?? null,
            item.description ?? null,
            item.stock_on_hand,
            item.reorder_level ?? null,
            item.item_id,
            now,
          ]
        );
        const initTxKey = `sync:${item.item_id}:${todayStr}`;
        await pool.query(
          `INSERT INTO zoho_stock_entries (id, item_id, source, quantity, note, zoho_tx_key, created_at)
           VALUES ($1, $2, 'zoho_sync', $3, $4, $5, $6)
           ON CONFLICT (zoho_tx_key) WHERE zoho_tx_key IS NOT NULL DO NOTHING`,
          [
            entryId(),
            newId,
            item.stock_on_hand,
            `Initial Zoho sync — stock: ${item.stock_on_hand} ${item.unit ?? ""}`.trim(),
            initTxKey,
            now,
          ]
        );
      }
    }

    for (const sale of salesLines) {
      const dbId = zohoIdToDbId.get(sale.item_id);
      if (!dbId) continue;
      const ts = sale.date ? new Date(sale.date).getTime() : now;
      const txKey = `inv:${sale.invoice_id}:line:${sale.line_item_id}`;
      await pool.query(
        `INSERT INTO zoho_stock_entries (id, item_id, source, quantity, note, zoho_tx_key, created_at)
         VALUES ($1, $2, 'zoho_sale', $3, $4, $5, $6)
         ON CONFLICT (zoho_tx_key) WHERE zoho_tx_key IS NOT NULL DO NOTHING`,
        [entryId(), dbId, sale.quantity, `Vente/بيع — ${sale.date ?? ""}`, txKey, ts]
      ).catch(() => {});
    }

    for (const purchase of purchaseLines) {
      const dbId = zohoIdToDbId.get(purchase.item_id);
      if (!dbId) continue;
      const ts = purchase.date ? new Date(purchase.date).getTime() : now;
      const txKey = `po:${purchase.purchaseorder_id}:line:${purchase.line_item_id}`;
      await pool.query(
        `INSERT INTO zoho_stock_entries (id, item_id, source, quantity, note, zoho_tx_key, created_at)
         VALUES ($1, $2, 'zoho_purchase', $3, $4, $5, $6)
         ON CONFLICT (zoho_tx_key) WHERE zoho_tx_key IS NOT NULL DO NOTHING`,
        [entryId(), dbId, purchase.quantity, `Achat/شراء — ${purchase.date ?? ""}`, txKey, ts]
      ).catch(() => {});
    }

    for (const adj of adjustmentLines) {
      const dbId = zohoIdToDbId.get(adj.item_id);
      if (!dbId) continue;
      const ts = adj.date ? new Date(adj.date).getTime() : now;
      const txKey = `adj:${adj.adjustment_id}:line:${adj.line_item_id}`;
      const note = adj.reason
        ? `Ajust./تعديل — ${adj.date ?? ""} — ${adj.reason}`
        : `Ajust./تعديل — ${adj.date ?? ""}`;
      await pool.query(
        `INSERT INTO zoho_stock_entries (id, item_id, source, quantity, note, zoho_tx_key, created_at)
         VALUES ($1, $2, 'zoho_adjustment', $3, $4, $5, $6)
         ON CONFLICT (zoho_tx_key) WHERE zoho_tx_key IS NOT NULL DO NOTHING`,
        [entryId(), dbId, adj.quantity_adjusted, note, txKey, ts]
      ).catch(() => {});
    }

    await pool.query(
      `INSERT INTO zoho_sync_meta (key, value) VALUES ('last_transactions_synced_at', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [String(now)]
    );

    const itemMeta = new Map(
      zohoItems.map((i) => [i.item_id, i])
    );
    const analyzeResults: Array<{ id: string; ok: boolean }> = [];
    for (const [zohoItemId, dbId] of zohoIdToDbId.entries()) {
      const meta = itemMeta.get(zohoItemId);
      if (!meta) continue;
      try {
        await runAiAnalysis(
          dbId,
          meta.name,
          meta.stock_on_hand,
          meta.unit ?? null,
          meta.reorder_level ?? null,
          lang
        );
        analyzeResults.push({ id: dbId, ok: true });
      } catch (err) {
        logger.warn({ err, dbId }, "AI analysis failed for item during sync");
        analyzeResults.push({ id: dbId, ok: false });
      }
    }

    const analyzed = analyzeResults.filter((r) => r.ok).length;

    res.json({
      success: true,
      synced: zohoItems.length,
      salesIngested: salesLines.length,
      purchasesIngested: purchaseLines.length,
      adjustmentsIngested: adjustmentLines.length,
      analyzed,
      syncedAt: now,
    });
  } catch (err: any) {
    logger.error({ err }, "zoho-stock/sync POST failed");
    res.status(500).json({ error: err.message ?? "خطأ في المزامنة" });
  }
});

router.post("/zoho-stock/items/:id/entry", async (req, res) => {
  if (!await requireExpert(req, res)) return;
  const { quantity, note, createdBy } = req.body;
  if (quantity == null || isNaN(Number(quantity))) {
    return res.status(400).json({ error: "الكمية مطلوبة" });
  }
  try {
    const check = await pool.query(
      `SELECT id FROM zoho_stock_items WHERE id = $1`,
      [req.params.id]
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "المنتج غير موجود" });

    const now = Date.now();
    const id = entryId();
    await pool.query(
      `INSERT INTO zoho_stock_entries (id, item_id, source, quantity, note, created_by, created_at)
       VALUES ($1, $2, 'team_input', $3, $4, $5, $6)`,
      [id, req.params.id, Number(quantity), note ?? null, createdBy ?? null, now]
    );
    await pool.query(
      `UPDATE zoho_stock_items SET current_stock = $1 WHERE id = $2`,
      [Number(quantity), req.params.id]
    );
    const r = await pool.query(
      `SELECT * FROM zoho_stock_entries WHERE id = $1`,
      [id]
    );
    res.status(201).json(mapEntry(r.rows[0]));
  } catch (err: any) {
    logger.error({ err }, "zoho-stock/items/:id/entry POST failed");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/zoho-stock/analyze", async (req, res) => {
  if (!await requireExpert(req, res)) return;
  const { itemId, lang } = req.body;
  if (!itemId) return res.status(400).json({ error: "itemId مطلوب" });

  try {
    const itemRow = await pool.query(
      `SELECT * FROM zoho_stock_items WHERE id = $1`,
      [itemId]
    );
    if (itemRow.rows.length === 0)
      return res.status(404).json({ error: "المنتج غير موجود" });

    const item = itemRow.rows[0];

    await runAiAnalysis(
      item.id,
      item.name,
      Number(item.current_stock),
      item.unit ?? null,
      item.reorder_level != null ? Number(item.reorder_level) : null,
      lang ?? "ar"
    );

    const updated = await pool.query(
      `SELECT ai_suggested_level, ai_reorder_threshold, ai_trend, ai_reasoning, ai_analyzed_at
       FROM zoho_stock_items WHERE id = $1`,
      [itemId]
    );
    const u = updated.rows[0];

    res.json({
      suggestedLevel: u.ai_suggested_level != null ? Number(u.ai_suggested_level) : null,
      reorderThreshold: u.ai_reorder_threshold != null ? Number(u.ai_reorder_threshold) : null,
      trend: u.ai_trend ?? null,
      reasoning: u.ai_reasoning ?? null,
      analyzedAt: u.ai_analyzed_at != null ? Number(u.ai_analyzed_at) : null,
    });
  } catch (err: any) {
    logger.error({ err }, "zoho-stock/analyze POST failed");
    res.status(500).json({ error: err.message ?? "خطأ في التحليل" });
  }
});

function mapItem(row: any) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku ?? null,
    unit: row.unit ?? null,
    description: row.description ?? null,
    currentStock: Number(row.current_stock ?? 0),
    reorderLevel: row.reorder_level != null ? Number(row.reorder_level) : null,
    zohoItemId: row.zoho_item_id ?? null,
    aiSuggestedLevel: row.ai_suggested_level != null ? Number(row.ai_suggested_level) : null,
    aiReorderThreshold: row.ai_reorder_threshold != null ? Number(row.ai_reorder_threshold) : null,
    aiTrend: row.ai_trend ?? null,
    aiReasoning: row.ai_reasoning ?? null,
    aiAnalyzedAt: row.ai_analyzed_at != null ? Number(row.ai_analyzed_at) : null,
    syncedAt: row.synced_at != null ? Number(row.synced_at) : null,
    createdAt: Number(row.created_at ?? 0),
  };
}

function mapEntry(row: any) {
  return {
    id: row.id,
    itemId: row.item_id,
    source: row.source,
    quantity: Number(row.quantity ?? 0),
    note: row.note ?? null,
    createdBy: row.created_by ?? null,
    createdAt: Number(row.created_at ?? 0),
  };
}

export default router;

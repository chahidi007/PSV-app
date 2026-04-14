import { logger } from "./logger";

const ZOHO_CLIENT_ID = process.env["ZOHO_CLIENT_ID"] ?? "";
const ZOHO_CLIENT_SECRET = process.env["ZOHO_CLIENT_SECRET"] ?? "";
const ZOHO_REFRESH_TOKEN = process.env["ZOHO_REFRESH_TOKEN"] ?? "";
const ZOHO_ORGANIZATION_ID = process.env["ZOHO_ORGANIZATION_ID"] ?? "";
const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.eu/oauth/v2/token";
const ZOHO_BOOKS_URL = "https://www.zohoapis.eu/books/v3";

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

export async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error("Zoho credentials not configured. Please set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN env vars.");
  }
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    refresh_token: ZOHO_REFRESH_TOKEN,
  });
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}?${params}`, { method: "POST" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Zoho token refresh failed: HTTP ${res.status} — ${text}`);
  }
  const data = await res.json() as { access_token: string; expires_in: number; error?: string };
  if (data.error) throw new Error(`Zoho token error: ${data.error}`);
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  return cachedAccessToken;
}

async function zohoGet(path: string): Promise<any> {
  const token = await getAccessToken();
  const url = `${ZOHO_BOOKS_URL}${path}${path.includes("?") ? "&" : "?"}organization_id=${ZOHO_ORGANIZATION_ID}`;
  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Zoho API error ${res.status}: ${text}`);
  }
  return res.json();
}

export interface ZohoItem {
  item_id: string;
  name: string;
  sku?: string;
  unit?: string;
  status: string;
  stock_on_hand: number;
  reorder_level?: number;
  description?: string;
}

export interface ZohoSalesLine {
  invoice_id: string;
  line_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  date: string;
}

export interface ZohoPurchaseLine {
  purchaseorder_id: string;
  line_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  date: string;
}

export async function fetchItems(): Promise<ZohoItem[]> {
  const all: ZohoItem[] = [];
  let page = 1;
  while (true) {
    const data = await zohoGet(`/items?page=${page}&per_page=200`);
    const items: ZohoItem[] = (data.items ?? []).map((i: any) => ({
      item_id: i.item_id,
      name: i.name,
      sku: i.sku ?? null,
      unit: i.unit ?? null,
      status: i.status,
      stock_on_hand: Number(i.stock_on_hand ?? 0),
      reorder_level: i.reorder_level != null ? Number(i.reorder_level) : null,
      description: i.description ?? null,
    }));
    all.push(...items);
    if (!data.page_context?.has_more_page) break;
    page++;
  }
  return all;
}

export async function fetchSalesLines(fromDate: string): Promise<ZohoSalesLine[]> {
  const lines: ZohoSalesLine[] = [];
  let page = 1;
  while (true) {
    const data = await zohoGet(`/invoices?date_after=${fromDate}&page=${page}&per_page=200`);
    const invoices: any[] = data.invoices ?? [];
    for (const inv of invoices) {
      const detail = await zohoGet(`/invoices/${inv.invoice_id}`).catch(() => null);
      if (!detail?.invoice?.line_items) continue;
      for (const li of detail.invoice.line_items) {
        if (!li.item_id) continue;
        lines.push({
          invoice_id: inv.invoice_id,
          line_item_id: li.line_item_id ?? li.id ?? `${inv.invoice_id}-${li.item_id}`,
          item_id: li.item_id,
          item_name: li.name ?? li.item_name ?? "",
          quantity: Number(li.quantity ?? 0),
          date: inv.date ?? inv.invoice_date ?? "",
        });
      }
    }
    if (!data.page_context?.has_more_page) break;
    page++;
  }
  return lines;
}

export async function fetchPurchaseLines(fromDate: string): Promise<ZohoPurchaseLine[]> {
  const lines: ZohoPurchaseLine[] = [];
  let page = 1;
  while (true) {
    const data = await zohoGet(`/purchaseorders?date_after=${fromDate}&page=${page}&per_page=200`);
    const orders: any[] = data.purchaseorders ?? [];
    for (const po of orders) {
      const detail = await zohoGet(`/purchaseorders/${po.purchaseorder_id}`).catch(() => null);
      if (!detail?.purchaseorder?.line_items) continue;
      for (const li of detail.purchaseorder.line_items) {
        if (!li.item_id) continue;
        lines.push({
          purchaseorder_id: po.purchaseorder_id,
          line_item_id: li.line_item_id ?? li.id ?? `${po.purchaseorder_id}-${li.item_id}`,
          item_id: li.item_id,
          item_name: li.name ?? li.item_name ?? "",
          quantity: Number(li.quantity ?? 0),
          date: po.date ?? po.purchaseorder_date ?? "",
        });
      }
    }
    if (!data.page_context?.has_more_page) break;
    page++;
  }
  return lines;
}

export interface ZohoAdjustmentLine {
  adjustment_id: string;
  line_item_id: string;
  item_id: string;
  item_name: string;
  quantity_adjusted: number;
  date: string;
  reason?: string;
}

export async function fetchInventoryAdjustments(fromDate: string): Promise<ZohoAdjustmentLine[]> {
  const lines: ZohoAdjustmentLine[] = [];
  let page = 1;
  while (true) {
    const data = await zohoGet(
      `/inventoryadjustments?date_after=${fromDate}&page=${page}&per_page=200`
    );
    const adjustments: any[] = data.inventory_adjustments ?? [];
    for (const adj of adjustments) {
      const detail = await zohoGet(
        `/inventoryadjustments/${adj.inventory_adjustment_id}`
      ).catch(() => null);
      if (!detail?.inventory_adjustment?.line_items) continue;
      let lineIndex = 0;
      for (const li of detail.inventory_adjustment.line_items) {
        if (!li.item_id) continue;
        lines.push({
          adjustment_id: adj.inventory_adjustment_id,
          line_item_id: li.line_item_id ?? li.id ?? `${adj.inventory_adjustment_id}-${lineIndex}`,
          item_id: li.item_id,
          item_name: li.item_name ?? li.name ?? "",
          quantity_adjusted: Number(li.quantity_adjusted ?? li.quantity ?? 0),
          date: adj.date ?? adj.adjustment_date ?? "",
          reason: adj.reason ?? adj.description ?? undefined,
        });
        lineIndex++;
      }
    }
    if (!data.page_context?.has_more_page) break;
    page++;
  }
  return lines;
}

export function isZohoConfigured(): boolean {
  return !!(ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET && ZOHO_REFRESH_TOKEN && ZOHO_ORGANIZATION_ID);
}

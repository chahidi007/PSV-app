const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const CF_WORKER_URL = process.env.EXPO_PUBLIC_CF_WORKER_URL ?? "https://phytoclinic-register.chahidi-mourad.workers.dev";

export interface ZohoStockItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  description: string | null;
  currentStock: number;
  reorderLevel: number | null;
  zohoItemId: string | null;
  aiSuggestedLevel: number | null;
  aiReorderThreshold: number | null;
  aiTrend: string | null;
  aiReasoning: string | null;
  aiAnalyzedAt: number | null;
  syncedAt: number | null;
  createdAt: number;
}

export interface ZohoStockEntry {
  id: string;
  itemId: string;
  source: "zoho_sync" | "zoho_sale" | "zoho_purchase" | "zoho_adjustment" | "team_input";
  quantity: number;
  note: string | null;
  createdBy: string | null;
  createdAt: number;
}

export interface ZohoStockAnalysis {
  suggestedLevel: number;
  reorderThreshold: number;
  trend: string;
  reasoning: string;
  analyzedAt: number;
}

export interface ExpertDTO {
  id: string;
  name: string;
  specialty: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserDTO {
  id: string;
  name: string;
  role: "client" | "expert";
  phone: string;
  specialty?: string;
  location?: string;
  sessionToken?: string;
}

export interface ConversationDTO {
  id: string;
  clientId: string;
  clientName: string;
  expertId?: string;
  expertName?: string;
  expertSpecialty?: string;
  title: string;
  issue: string;
  status: "open" | "in_progress" | "resolved";
  thumbnailUri?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  lastMessageType?: string;
  unreadCount: number;
  createdAt: number;
  rating?: number | null;
  responseTimeMs?: number | null;
  typingUserId?: string | null;
  typingAt?: number | null;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "client" | "expert";
  type: "text" | "image" | "audio" | "video";
  content: string;
  imageUri?: string;
  audioUri?: string;
  audioDuration?: number;
  videoUri?: string;
  isRead: boolean;
  timestamp: number;
}

async function cfRequest<T>(path: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 10000);
  try {
    const res = await fetch(`${CF_WORKER_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as any).error ?? `HTTP ${res.status}`);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, options?: RequestInit & { adminKey?: string; userId?: string; sessionToken?: string; timeoutMs?: number }): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.adminKey ? { "X-Admin-Key": options.adminKey } : {}),
    ...(options?.userId ? { "X-User-Id": options.userId } : {}),
    ...(options?.sessionToken ? { "X-Session-Token": options.sessionToken } : {}),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 10000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  auth: {
    register: (data: {
      name: string; phone: string; password: string; role: string;
      specialty?: string; location?: string;
    }): Promise<UserDTO> =>
      cfRequest("/api/register", { method: "POST", body: JSON.stringify(data) }),

    login: (data: { phone: string; password: string }): Promise<UserDTO> =>
      cfRequest("/api/login", { method: "POST", body: JSON.stringify(data) }),

    serverLogin: (data: { phone: string; password: string }): Promise<UserDTO> =>
      request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

    serverRegister: (data: {
      name: string; phone: string; password: string; role: string;
      specialty?: string; location?: string;
    }): Promise<UserDTO> =>
      request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),

    googleLogin: (accessToken: string): Promise<UserDTO> =>
      request("/api/auth/google", { method: "POST", body: JSON.stringify({ accessToken }) }),

    googleInit: (): Promise<{ url: string; state: string }> =>
      request("/api/auth/google/init"),

    googleResult: (state: string): Promise<{ status: "pending" | "success" | "error" | "not_found"; user?: UserDTO & { sessionToken: string }; error?: string }> =>
      request(`/api/auth/google/result?state=${encodeURIComponent(state)}`),
  },

  experts: {
    list: (): Promise<ExpertDTO[]> => request("/api/experts"),
    create: (
      data: { name: string; specialty: string; location: string; phone?: string; password?: string },
      adminKey: string
    ): Promise<ExpertDTO> =>
      request("/api/experts", { method: "POST", body: JSON.stringify(data), adminKey }),
    update: (id: string, data: Partial<ExpertDTO>, adminKey: string): Promise<ExpertDTO> =>
      request(`/api/experts/${id}`, { method: "PUT", body: JSON.stringify(data), adminKey }),
    delete: (id: string, adminKey: string): Promise<{ success: boolean }> =>
      request(`/api/experts/${id}`, { method: "DELETE", adminKey }),
  },

  conversations: {
    list: (userId: string, role: string): Promise<ConversationDTO[]> =>
      request(`/api/conversations?userId=${encodeURIComponent(userId)}&role=${role}`),
    create: (data: Omit<ConversationDTO, "unreadCount" | "lastMessage" | "lastMessageTime" | "lastMessageType">): Promise<ConversationDTO> =>
      request("/api/conversations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ConversationDTO>): Promise<ConversationDTO> =>
      request(`/api/conversations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    markRead: (id: string): Promise<{ success: boolean }> =>
      request(`/api/conversations/${id}/read`, { method: "PUT" }),
    messages: (conversationId: string, since?: number): Promise<MessageDTO[]> =>
      request(`/api/conversations/${conversationId}/messages${since ? `?since=${since}` : ""}`),
    rate: (id: string, rating: number): Promise<{ ok: boolean }> =>
      request(`/api/conversations/${id}/rating`, { method: "PUT", body: JSON.stringify({ rating }) }),
    setTyping: (id: string, userId: string): Promise<{ ok: boolean }> =>
      request(`/api/conversations/${id}/typing`, { method: "PUT", body: JSON.stringify({ userId }) }),
    delete: (id: string): Promise<{ success: boolean }> =>
      request(`/api/conversations/${id}`, { method: "DELETE" }),
  },

  users: {
    status: (userId: string): Promise<{ lastSeen: number | null; isOnline: boolean }> =>
      request(`/api/users/${userId}/status`),
  },

  messages: {
    send: (data: Omit<MessageDTO, "isRead">): Promise<MessageDTO> =>
      request("/api/messages", { method: "POST", body: JSON.stringify(data) }),
  },

  notifications: {
    savePushToken: (userId: string, token: string): Promise<{ success: boolean }> =>
      request("/api/auth/push-token", { method: "PUT", body: JSON.stringify({ userId, token }) }),
  },

  heartbeat: (userId: string): Promise<{ ok: boolean }> =>
    request("/api/auth/heartbeat", { method: "PUT", body: JSON.stringify({ userId }) }),

  admin: {
    users: {
      list: (adminKey: string): Promise<(UserDTO & { createdAt: number | null })[]> =>
        request("/api/admin/users", { adminKey }),
      delete: (id: string, adminKey: string): Promise<{ success: boolean }> =>
        request(`/api/admin/users/${id}`, { method: "DELETE", adminKey }),
    },
    conversations: {
      list: (adminKey: string, status?: "pending"): Promise<ConversationDTO[]> =>
        request(`/api/admin/conversations${status ? `?status=${status}` : ""}`, { adminKey }),
      assign: (
        convId: string,
        data: { expertId: string; expertName: string; expertSpecialty: string },
        adminKey: string
      ): Promise<ConversationDTO> =>
        request(`/api/admin/conversations/${convId}/assign`, {
          method: "PUT",
          body: JSON.stringify(data),
          adminKey,
        }),
    },
    updatePhytoIndex: (adminKey: string): Promise<{ success: boolean; count?: number; updatedAt?: string; error?: string }> =>
      request("/api/admin/update-phyto", { method: "POST", adminKey }),
  },
  preliminaryDiagnosis: (data: { description: string; culture: string; region: string; lang: string }): Promise<{
    title: string; category: string; urgency: "high" | "medium" | "low";
    suggestions: string[]; expertSpecialty: string;
  }> => request("/api/preliminary-diagnosis", { method: "POST", body: JSON.stringify(data) }),

  zohoStock: {
    items: (sessionToken: string): Promise<ZohoStockItem[]> =>
      request("/api/zoho-stock/items", { sessionToken }),
    history: (itemId: string, sessionToken: string): Promise<ZohoStockEntry[]> =>
      request(`/api/zoho-stock/items/${itemId}/history`, { sessionToken }),
    sync: (sessionToken: string, lang?: string): Promise<{ success: boolean; synced: number; salesIngested: number; purchasesIngested: number; adjustmentsIngested: number; analyzed: number; syncedAt: number }> =>
      request("/api/zoho-stock/sync", { method: "POST", body: JSON.stringify({ lang: lang ?? "ar" }), sessionToken }),
    addEntry: (
      itemId: string,
      data: { quantity: number; note?: string; createdBy?: string },
      sessionToken: string
    ): Promise<ZohoStockEntry> =>
      request(`/api/zoho-stock/items/${itemId}/entry`, {
        method: "POST",
        body: JSON.stringify(data),
        sessionToken,
      }),
    analyze: (
      itemId: string,
      lang: string,
      sessionToken: string
    ): Promise<ZohoStockAnalysis> =>
      request("/api/zoho-stock/analyze", {
        method: "POST",
        body: JSON.stringify({ itemId, lang }),
        sessionToken,
        timeoutMs: 30000,
      }),
  },

  uploadImage: (data: {
    imageBase64: string;
    mimeType?: string;
    userId?: string;
    conversationId?: string;
  }): Promise<{ photoId: string; url: string; filename: string }> =>
    request("/api/upload-image", { method: "POST", body: JSON.stringify(data) }),

  diagnoseImage: async (data: {
    imageBase64: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    culture?: string;
    region?: string;
    description?: string;
    lang?: "ar" | "fr";
    userId?: string;
    timeoutMs?: number;
  }): Promise<{
    diseases: Array<{
      name: string;
      confidence: number;
      description: string;
      recommendations: string[];
    }>;
    summary: string;
    urgency: "high" | "medium" | "low";
    disclaimer: string;
  }> => {
    const { imageBase64, mimeType, userId, timeoutMs, ...rest } = data;
    let imageUrl: string | undefined;
    try {
      const uploaded = await request("/api/upload-image", {
        method: "POST",
        body: JSON.stringify({ imageBase64, mimeType, userId }),
      }) as { url: string };
      imageUrl = uploaded.url;
    } catch {
      // fallback: send base64 directly if upload fails
    }
    return request("/api/diagnose-image", {
      method: "POST",
      body: JSON.stringify(imageUrl ? { imageUrl, mimeType, ...rest } : { imageBase64, mimeType, ...rest }),
      timeoutMs: timeoutMs ?? 60000,
    });
  },
};

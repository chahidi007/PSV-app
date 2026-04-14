import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, type ExpertDTO, type ConversationDTO, type MessageDTO } from "@/services/api";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotification } from "@/context/NotificationContext";
import { useLanguage } from "@/context/LanguageContext";

export type UserRole = "client" | "expert";

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
  location?: string;
  sessionToken?: string;
}

export type MessageType = "text" | "image" | "audio" | "video";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  type: MessageType;
  content: string;
  imageUri?: string;
  audioUri?: string;
  audioDuration?: number;
  videoUri?: string;
  timestamp: number;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  clientId: string;
  clientName: string;
  expertId?: string;
  expertName?: string;
  expertSpecialty?: string;
  title: string;
  issue: string;
  status: "open" | "in_progress" | "resolved";
  lastMessage?: string;
  lastMessageTime?: number;
  lastMessageType?: MessageType;
  unreadCount: number;
  thumbnailUri?: string;
  createdAt: number;
  rating?: number | null;
  responseTimeMs?: number | null;
  typingUserId?: string | null;
  typingAt?: number | null;
}

interface AppContextType {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  conversations: Conversation[];
  addConversation: (conv: Omit<Conversation, "id" | "createdAt" | "unreadCount">) => Promise<Conversation>;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  messages: Record<string, Message[]>;
  loadMessages: (conversationId: string, since?: number) => Promise<void>;
  addMessage: (msg: Omit<Message, "id" | "timestamp" | "isRead">) => Promise<Message>;
  markConversationRead: (convId: string) => Promise<void>;
  rateConversation: (convId: string, rating: number) => Promise<void>;
  experts: UserProfile[];
  isOnboarded: boolean;
  sessionLoaded: boolean;
  setOnboarded: (val: boolean) => void;
  signOut: () => Promise<void>;
  login: (phone: string, password: string) => Promise<UserProfile>;
  register: (data: { name: string; phone: string; password: string; role: UserRole; specialty?: string; location?: string }) => Promise<UserProfile>;
  loginWithGoogle: (accessToken: string) => Promise<UserProfile>;
  loginWithSession: (userData: { id: string; name: string; role: string; phone: string | null; specialty?: string | null; location?: string | null; sessionToken: string }) => Promise<UserProfile>;
}

const AppContext = createContext<AppContextType | null>(null);


function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function dtoToConv(d: ConversationDTO): Conversation {
  return { ...d, lastMessageType: d.lastMessageType as MessageType | undefined };
}

function dtoToMsg(d: MessageDTO): Message {
  return { ...d, type: d.type as MessageType, senderRole: d.senderRole as UserRole };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isOnboarded, setIsOnboardedState] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [experts, setExperts] = useState<UserProfile[]>([]);

  const { notify } = useNotification();
  const { t } = useLanguage();

  usePushNotifications(profile?.id ?? null, notify);

  // Heartbeat: keep last_seen updated every 30s while the user is logged in
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (profile?.id) {
      api.heartbeat(profile.id).catch(() => {});
      heartbeatRef.current = setInterval(() => {
        api.heartbeat(profile.id).catch(() => {});
      }, 30000);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [profile?.id]);

  useEffect(() => {
    loadSession();
    loadExperts();
  }, []);

  const loadSession = async () => {
    try {
      const [profileJson, onboardedJson] = await Promise.all([
        AsyncStorage.getItem("profile"),
        AsyncStorage.getItem("onboarded"),
      ]);
      if (profileJson) setProfileState(JSON.parse(profileJson));
      if (onboardedJson) setIsOnboardedState(JSON.parse(onboardedJson));
    } catch { /* ignore */ } finally {
      setSessionLoaded(true);
    }
  };

  const loadExperts = async () => {
    try {
      const data = await api.experts.list();
      if (data && data.length > 0) {
        setExperts(data.filter((e) => e.isActive).map((e) => ({
          id: e.id, name: e.name, role: "expert" as UserRole, specialty: e.specialty, location: e.location,
        })));
      }
    } catch { /* use fallback */ }
  };

  const loadConversations = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await api.conversations.list(profile.id, profile.role);
      setConversations(data.map(dtoToConv));
    } catch { /* ignore */ }
  }, [profile]);

  // Background polling: runs regardless of which screen is active
  const prevUnreadRef = useRef<Record<string, number>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    if (!profile?.id || !isOnboarded) return;
    pollRef.current = setInterval(async () => {
      if (!profileRef.current) return;
      try {
        const data = await api.conversations.list(profileRef.current.id, profileRef.current.role);
        const fresh = data.map(dtoToConv);
        let hasChanges = false;
        fresh.forEach((c) => {
          const prev = prevUnreadRef.current[c.id] ?? -1;
          if (prev >= 0 && c.unreadCount > prev) {
            const isExpert = profileRef.current?.role === "expert";
            notify({
              title: t.newMessage,
              body: isExpert ? t.clientSent : t.expertReplied,
              conversationId: c.id,
            });
            hasChanges = true;
          }
          if (prev !== c.unreadCount || prev === -1) hasChanges = true;
          prevUnreadRef.current[c.id] = c.unreadCount;
        });
        if (hasChanges || fresh.length !== prevUnreadRef.current.__len__) {
          (prevUnreadRef.current as any).__len__ = fresh.length;
          setConversations(fresh);
        }
      } catch { /* ignore */ }
    }, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [profile?.id, isOnboarded, notify, t]);

  const loadMessages = useCallback(async (conversationId: string, since?: number) => {
    try {
      const data = await api.conversations.messages(conversationId, since);
      if (since) {
        setMessages((prev) => {
          const existing = prev[conversationId] ?? [];
          const existingIds = new Set(existing.map((m) => m.id));
          const newOnes = data.map(dtoToMsg).filter((m) => !existingIds.has(m.id));
          if (!newOnes.length) return prev;
          return { ...prev, [conversationId]: [...existing, ...newOnes] };
        });
      } else {
        setMessages((prev) => ({ ...prev, [conversationId]: data.map(dtoToMsg) }));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (profile && isOnboarded) loadConversations();
  }, [profile, isOnboarded]);

  const login = useCallback(async (phone: string, password: string): Promise<UserProfile> => {
    const user = await api.auth.login({ phone, password });
    const sessionToken = await api.auth.serverLogin({ phone, password })
      .then((r) => r.sessionToken)
      .catch(() => undefined);
    const p: UserProfile = { id: user.id, name: user.name, role: user.role, phone: user.phone, specialty: user.specialty, location: user.location, sessionToken };
    // Clear any stale conversation data from the previous session before setting new profile
    setConversations([]);
    setMessages({});
    setProfileState(p);
    await AsyncStorage.setItem("profile", JSON.stringify(p));
    await AsyncStorage.setItem("onboarded", JSON.stringify(true));
    setIsOnboardedState(true);
    return p;
  }, []);

  const register = useCallback(async (data: { name: string; phone: string; password: string; role: UserRole; specialty?: string; location?: string }): Promise<UserProfile> => {
    const user = await api.auth.register(data);
    const serverRegResult = await api.auth.serverRegister(data).catch(() => null);
    const sessionToken = serverRegResult?.sessionToken
      ?? await api.auth.serverLogin({ phone: data.phone, password: data.password })
          .then((r) => r.sessionToken)
          .catch(() => undefined);
    const p: UserProfile = { id: user.id, name: user.name, role: user.role, phone: user.phone, specialty: user.specialty, location: user.location, sessionToken };
    setConversations([]);
    setMessages({});
    setProfileState(p);
    await AsyncStorage.setItem("profile", JSON.stringify(p));
    await AsyncStorage.setItem("onboarded", JSON.stringify(true));
    setIsOnboardedState(true);
    return p;
  }, []);

  const setProfile = useCallback(async (p: UserProfile) => {
    setProfileState(p);
    await AsyncStorage.setItem("profile", JSON.stringify(p));
  }, []);

  const setOnboarded = useCallback(async (val: boolean) => {
    setIsOnboardedState(val);
    await AsyncStorage.setItem("onboarded", JSON.stringify(val));
  }, []);

  const addConversation = useCallback(async (conv: Omit<Conversation, "id" | "createdAt" | "unreadCount">): Promise<Conversation> => {
    const id = generateId();
    const createdAt = Date.now();
    const dto = await api.conversations.create({ id, createdAt, unreadCount: 0, ...conv });
    const newConv = dtoToConv(dto);
    setConversations((prev) => [newConv, ...prev]);
    return newConv;
  }, []);

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    api.conversations.update(id, updates).catch(() => { /* ignore */ });
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setMessages((prev) => { const next = { ...prev }; delete next[id]; return next; });
    await api.conversations.delete(id);
  }, []);

  const addMessage = useCallback(async (msg: Omit<Message, "id" | "timestamp" | "isRead">): Promise<Message> => {
    const id = generateId();
    const timestamp = Date.now();
    const newMsg: Message = { ...msg, id, timestamp, isRead: false };
    setMessages((prev) => {
      const convMsgs = prev[msg.conversationId] ?? [];
      return { ...prev, [msg.conversationId]: [...convMsgs, newMsg] };
    });
    const lastText = msg.type === "image" ? "صورة مشتركة" : msg.type === "audio" ? "رسالة صوتية" : msg.type === "video" ? "فيديو مشترك" : msg.content;
    setConversations((prev) => prev.map((c) => c.id === msg.conversationId
      ? { ...c, lastMessage: lastText, lastMessageTime: timestamp, lastMessageType: msg.type, status: "in_progress" as const }
      : c));
    try {
      await api.messages.send({ ...newMsg });
    } catch { /* ignore — message already shown locally */ }
    return newMsg;
  }, []);

  const markConversationRead = useCallback(async (convId: string) => {
    setMessages((prev) => {
      const msgs = (prev[convId] ?? []).map((m) => ({ ...m, isRead: true }));
      return { ...prev, [convId]: msgs };
    });
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, unreadCount: 0 } : c));
    try { await api.conversations.markRead(convId); } catch { /* ignore */ }
  }, []);

  const rateConversation = useCallback(async (convId: string, rating: number) => {
    try { await api.conversations.rate(convId, rating); } catch { /* ignore */ }
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string): Promise<UserProfile> => {
    const user = await api.auth.googleLogin(accessToken);
    const p: UserProfile = {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      specialty: user.specialty,
      location: user.location,
      sessionToken: user.sessionToken,
    };
    setConversations([]);
    setMessages({});
    setProfileState(p);
    await AsyncStorage.setItem("profile", JSON.stringify(p));
    await AsyncStorage.setItem("onboarded", JSON.stringify(true));
    setIsOnboardedState(true);
    return p;
  }, []);

  const loginWithSession = useCallback(async (userData: { id: string; name: string; role: string; phone: string | null; specialty?: string | null; location?: string | null; sessionToken: string }): Promise<UserProfile> => {
    const p: UserProfile = {
      id: userData.id,
      name: userData.name,
      role: userData.role as UserRole,
      phone: userData.phone,
      specialty: userData.specialty ?? undefined,
      location: userData.location ?? undefined,
      sessionToken: userData.sessionToken,
    };
    setConversations([]);
    setMessages({});
    setProfileState(p);
    await AsyncStorage.setItem("profile", JSON.stringify(p));
    await AsyncStorage.setItem("onboarded", JSON.stringify(true));
    setIsOnboardedState(true);
    return p;
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.clear();
    setProfileState(null);
    setConversations([]);
    setMessages({});
    setIsOnboardedState(false);
  }, []);

  return (
    <AppContext.Provider value={{
      profile, setProfile, conversations, addConversation, updateConversation, deleteConversation, loadConversations,
      messages, loadMessages, addMessage, markConversationRead, rateConversation,
      experts, isOnboarded, sessionLoaded, setOnboarded, signOut, login, register, loginWithGoogle, loginWithSession,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

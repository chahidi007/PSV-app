import React, { createContext, useCallback, useContext, useRef, useState } from "react";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  conversationId?: string;
}

interface NotificationContextType {
  notify: (n: Omit<AppNotification, "id">) => void;
  current: AppNotification | null;
  dismiss: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notify: () => {},
  current: null,
  dismiss: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setCurrent(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const notify = useCallback((n: Omit<AppNotification, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setCurrent({ ...n, id });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCurrent(null), 4500);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, current, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}

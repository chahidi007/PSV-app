import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { api } from "@/services/api";

type NotifyFn = (n: { title: string; body: string; conversationId?: string }) => void;

async function registerForPushNotifications(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("phytoclinic", {
        name: "Phytoclinic",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2d6a4f",
        sound: "default",
      });
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: true,
      }),
    });

    if (!Device.default.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    await api.notifications.savePushToken(userId, tokenData.data);
  } catch {
  }
}

export function usePushNotifications(userId: string | null, notify?: NotifyFn) {
  const registered = useRef<string | null>(null);
  const notifyRef = useRef<NotifyFn | undefined>(notify);
  notifyRef.current = notify;

  useEffect(() => {
    if (!userId || registered.current === userId) return;
    registered.current = userId;
    registerForPushNotifications(userId);
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let tapSub: any;
    let receiveSub: any;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const convId = response.notification.request.content.data?.conversationId;
          if (convId) router.push(`/conversation/${convId}`);
        });

        receiveSub = Notifications.addNotificationReceivedListener((notification) => {
          const { title, body, data } = notification.request.content;
          if (notifyRef.current) {
            notifyRef.current({
              title: title ?? "رسالة جديدة",
              body: body ?? "",
              conversationId: data?.conversationId as string | undefined,
            });
          }
        });
      } catch {
      }
    })();
    return () => {
      tapSub?.remove?.();
      receiveSub?.remove?.();
    };
  }, []);
}

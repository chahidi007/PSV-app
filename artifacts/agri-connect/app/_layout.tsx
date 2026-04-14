import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import FloatingLangToggle from "@/components/FloatingLangToggle";
import InAppNotificationBanner from "@/components/InAppNotificationBanner";
import { AppProvider, useApp } from "@/context/AppContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { profile, isOnboarded, sessionLoaded } = useApp();

  useEffect(() => {
    if (!sessionLoaded) return;
    if (!isOnboarded || !profile) {
      router.replace("/onboarding");
    }
  }, [sessionLoaded, isOnboarded, profile]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 280,
          gestureEnabled: true,
          gestureDirection: "horizontal",
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
            animationDuration: 340,
          }}
        />
        <Stack.Screen
          name="new-consultation"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
            animationDuration: 320,
          }}
        />
        <Stack.Screen
          name="conversation/[id]"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 260,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="admin"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="zoho-stock"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 280,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="zoho-stock-detail"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 260,
            gestureEnabled: true,
          }}
        />
      </Stack>
      <InAppNotificationBanner />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <LanguageProvider>
        <NotificationProvider>
          <SafeAreaProvider>
            <ErrorBoundary>
              <QueryClientProvider client={queryClient}>
                <AppProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                    <FloatingLangToggle />
                  </GestureHandlerRootView>
                </AppProvider>
              </QueryClientProvider>
            </ErrorBoundary>
          </SafeAreaProvider>
        </NotificationProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

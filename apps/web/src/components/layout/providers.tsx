"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { useAuthStore } from "@/stores/auth-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthHydrator />
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function AuthHydrator() {
  const setHydrated = useAuthStore((state) => state.setHydrated);

  useEffect(() => {
    const persistApi = useAuthStore.persist;

    setHydrated(persistApi.hasHydrated());

    const unsubscribeStart = persistApi.onHydrate(() => {
      setHydrated(false);
    });

    const unsubscribeFinish = persistApi.onFinishHydration(() => {
      setHydrated(true);
    });

    void Promise.resolve(persistApi.rehydrate()).then(() => {
      setHydrated(true);
    });

    return () => {
      unsubscribeStart();
      unsubscribeFinish();
    };
  }, [setHydrated]);

  return null;
}

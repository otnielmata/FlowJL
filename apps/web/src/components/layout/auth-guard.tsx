"use client";

import { LockKeyhole } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass w-full max-w-md rounded-[2rem] border p-8 text-center shadow-[0_30px_80px_rgba(22,32,51,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[color:var(--primary)]/12 text-[color:var(--primary)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold">Preparando seu acesso</h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
            Estamos validando a sessao simulada para liberar o workspace.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

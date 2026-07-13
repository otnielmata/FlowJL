"use client";

import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";

import { mockUsers } from "@/mocks/flow-data";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const currentUserId = useAuthStore((state) => state.currentUserId);
  const setCurrentUserId = useAuthStore((state) => state.setCurrentUserId);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(22,32,51,0.12)] lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/65 px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)] shadow-sm dark:bg-white/8">
            <Sparkles className="h-4 w-4" />
            Flow JL Workspace
          </div>
          <h1 className="mt-6 max-w-xl font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Operação completa para lançamentos digitais em uma visão clara e conectada.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)] sm:text-lg">
            Centralize dashboard executivo, cronogramas, mídia paga, aprovações, produção e inteligência artificial
            em uma interface pensada para squads de alta cadência.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["Dashboard vivo", "Indicadores, alertas, campanhas e fila crítica sempre visíveis."],
              ["Execução orquestrada", "Kanban, calendário, filtros e checklists para manter o ritmo da operação."],
              ["Governança simulada", "Perfis, permissões e estados do sistema já prontos para evolução com a API."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border bg-white/55 p-5 dark:bg-white/5">
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(22,32,51,0.12)] lg:p-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--primary)]/12 text-[color:var(--primary)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-semibold">Entrar no ambiente Flow JL</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
            Escolha um perfil para simular permissões e navegar pelo produto completo do front-end.
          </p>

          <div className="mt-8 space-y-3">
            {mockUsers.map((user) => {
              const selected = currentUserId === user.id;

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setCurrentUserId(user.id)}
                  className={`w-full rounded-3xl border p-4 text-left transition ${
                    selected
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)]/8 shadow-sm"
                      : "bg-white/55 hover:border-[color:var(--primary)]/30 hover:bg-white dark:bg-white/5 dark:hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-[color:var(--muted-foreground)]">{user.roleLabel}</p>
                    </div>
                    <span className="rounded-full bg-[color:var(--secondary)] px-3 py-1 text-xs font-medium text-[color:var(--secondary-foreground)]">
                      {user.focus}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <Link
            href="/dashboard"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)] transition hover:opacity-90"
          >
            Acessar plataforma
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}

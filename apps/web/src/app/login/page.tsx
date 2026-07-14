"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { findMockUserByEmail } from "@/mocks/flow-data";
import { useAuthStore } from "@/stores/auth-store";

const loginSchema = z.object({
  email: z.email("Informe um email valido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const login = useAuthStore((state) => state.login);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function handleSubmit(values: LoginForm) {
    const user = findMockUserByEmail(values.email);

    if (!user || user.password !== values.password) {
      form.setError("email", { message: "Credenciais invalidas para acessar o portal." });
      form.setError("password", { message: "Revise email e senha informados." });
      toast.error("Nao foi possivel autenticar o acesso.");
      return;
    }

    login(user.id);
    toast.success("Acesso liberado ao workspace Flow JL.");
    router.push(nextPath === "/login" ? "/dashboard" : nextPath);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass brand-grid relative rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(22,32,51,0.12)] lg:p-12">
          <span className="brand-orb left-[-30px] top-[-24px] h-36 w-36 bg-[color:var(--primary)]/20" />
          <span className="brand-orb bottom-[-40px] right-[-10px] h-32 w-32 bg-cyan-400/16" />

          <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/65 px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)] shadow-sm dark:bg-white/8">
            <Sparkles className="h-4 w-4" />
            Flow JL Workspace
          </div>
          <div className="mt-6 flex items-center gap-4">
            <div className="overflow-hidden rounded-[1.75rem] shadow-[0_28px_50px_rgba(109,40,217,0.2)]">
              <Image src="/brand/jl-logo.jpeg" alt="Logo JL" width={82} height={82} className="h-20 w-20 object-cover" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">Identidade visual</p>
              <p className="mt-1 font-display text-2xl font-semibold">JL. como assinatura principal</p>
            </div>
          </div>
          <h1 className="mt-6 max-w-xl font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Operação completa para lançamentos digitais em uma visão clara e conectada.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)] sm:text-lg">
            Centralize dashboard executivo, cronogramas, mídia paga, aprovações, produção e inteligência artificial
            em uma interface pensada para squads de alta cadência.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              ["Roxo elétrico", "Base de destaque e ações principais"],
              ["Grafite limpo", "Superfície sólida para leitura e foco"],
              ["Verde-lima", "Acento de aprovação e energia da marca"],
            ].map(([title, description]) => (
              <div key={title} className="rounded-full border bg-white/60 px-4 py-2 text-sm dark:bg-white/6">
                <span className="font-semibold">{title}</span> · {description}
              </div>
            ))}
          </div>

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
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--primary)]/14 text-[color:var(--primary)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-semibold">Entrar no ambiente Flow JL</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
            Informe seu email e sua senha para acessar o sistema.
          </p>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-8 space-y-5">
            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium">Email</span>
                <input
                  type="email"
                  {...form.register("email")}
                  className="w-full rounded-2xl border bg-white/65 px-4 py-3 outline-none transition focus:border-[color:var(--primary)] dark:bg-white/6"
                  placeholder="seuemail@empresa.com"
                  autoComplete="email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-[color:var(--danger)]">{form.formState.errors.email.message}</p>
                )}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">Senha</span>
                <input
                  type="password"
                  {...form.register("password")}
                  className="w-full rounded-2xl border bg-white/65 px-4 py-3 outline-none transition focus:border-[color:var(--primary)] dark:bg-white/6"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-[color:var(--danger)]">{form.formState.errors.password.message}</p>
                )}
              </label>
            </div>

            <div className="rounded-3xl border bg-white/55 p-4 text-sm leading-6 text-[color:var(--muted-foreground)] dark:bg-white/5">
              Acesso de demonstracao: <strong>julia@flowjl.com</strong> e senha <strong>flowjl123</strong>.
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={form.formState.isSubmitting}
            >
              Acessar plataforma
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function LoginPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-md rounded-[2rem] border p-8 text-center shadow-[0_30px_80px_rgba(22,32,51,0.12)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--primary)]/12 text-[color:var(--primary)]">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold">Carregando acesso</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
          Estamos preparando a entrada segura no ambiente Flow JL.
        </p>
      </div>
    </main>
  );
}

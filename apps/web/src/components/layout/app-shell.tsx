"use client";

import { Command } from "cmdk";
import {
  BarChart3,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarRange,
  Clapperboard,
  Compass,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MoonStar,
  Radar,
  Rocket,
  Search,
  Settings2,
  Sparkles,
  SunMedium,
  ShieldCheck,
  Users2,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { getPageConfig, navItems, notifications } from "@/mocks/flow-data";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import { initialManagedUsers, useUserDirectoryStore } from "@/stores/user-directory-store";

const iconMap = {
  LayoutDashboard,
  Compass,
  Rocket,
  CalendarRange,
  Clapperboard,
  Megaphone,
  Radar,
  Workflow,
  BadgeCheck,
  Sparkles,
  BarChart3,
  Settings2,
  Users2,
  ShieldCheck,
  BriefcaseBusiness,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.currentUserId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const users = useUserDirectoryStore((state) => state.users);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const commandOpen = useUiStore((state) => state.commandOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const notificationsOpen = useUiStore((state) => state.notificationsOpen);
  const setNotificationsOpen = useUiStore((state) => state.setNotificationsOpen);
  const experienceState = useUiStore((state) => state.experienceState);
  const setExperienceState = useUiStore((state) => state.setExperienceState);
  const { theme, setTheme } = useTheme();

  const user = users.find((entry) => entry.id === currentUserId) ?? users[0] ?? initialManagedUsers[0];
  const visibleNavItems = navItems.filter((item) => getPageConfig(item.href).allowedRoles.includes(user.role));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "glass sticky top-0 hidden h-screen shrink-0 flex-col border-r px-3 py-4 shadow-[0_20px_60px_rgba(10,21,38,0.08)] lg:flex",
          sidebarCollapsed ? "w-[92px]" : "w-[284px]",
        )}
      >
        <div className="flex items-center gap-3 rounded-3xl px-3 py-2">
          <div className="overflow-hidden rounded-2xl shadow-[0_20px_40px_rgba(109,40,217,0.22)]">
            <Image src="/brand/jl-logo.jpeg" alt="Logo JL" width={48} height={48} className="h-12 w-12 object-cover" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="font-display text-lg font-semibold">Flow JL</p>
              <p className="text-sm text-[color:var(--muted-foreground)]">Workspace operacional JL</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mt-4 inline-flex items-center justify-center rounded-2xl border bg-white/60 px-4 py-3 text-sm font-medium hover:bg-white dark:bg-white/6 dark:hover:bg-white/10"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav className="scrollbar-thin mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
          {Array.from(new Set(visibleNavItems.map((item) => item.group))).map((group) => (
            <div key={group}>
              {!sidebarCollapsed && (
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  {group}
                </p>
              )}
              <div className="space-y-1">
                {visibleNavItems
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
                    const active = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                          active
                            ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-lg shadow-[color:var(--primary)]/20"
                            : "text-[color:var(--muted-foreground)] hover:bg-white/70 hover:text-[color:var(--foreground)] dark:hover:bg-white/6",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 px-4 pb-4 pt-4 sm:px-6 lg:px-8">
          <div className="glass brand-grid flex flex-col gap-4 rounded-[2rem] border px-4 py-4 shadow-[0_18px_50px_rgba(10,21,38,0.08)] sm:px-6">
            <span className="brand-orb right-[-32px] top-[-24px] h-28 w-28 bg-[color:var(--primary)]/22" />
            <span className="brand-orb bottom-[-30px] left-[22%] h-24 w-24 bg-[color:var(--accent)]/16" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[color:var(--muted-foreground)]">Operação Flow JL</p>
                <h1 className="font-display text-2xl font-semibold tracking-tight">Workspace de lançamento digital</h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border bg-white/65 px-4 py-2.5 text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] dark:bg-white/6"
                >
                  <Search className="h-4 w-4" />
                  Busca global
                  <span className="rounded-full bg-[color:var(--secondary)] px-2 py-0.5 text-xs text-[color:var(--secondary-foreground)]">
                    Ctrl K
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/65 hover:bg-white dark:bg-white/6"
                  aria-label="Abrir notificações"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[color:var(--warning)]" />
                </button>

                <div className="inline-flex overflow-hidden rounded-2xl border bg-white/65 dark:bg-white/6">
                  {[
                    { value: "light", icon: <SunMedium className="h-4 w-4" /> },
                    { value: "dark", icon: <MoonStar className="h-4 w-4" /> },
                    { value: "system", icon: <Sparkles className="h-4 w-4" /> },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center",
                        theme === option.value && "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]",
                      )}
                      aria-label={`Aplicar tema ${option.value}`}
                    >
                      {option.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-2xl border bg-white/65 px-4 py-2 text-sm dark:bg-white/6">
                <ShieldCheck className="h-4 w-4 text-[color:var(--primary)]" />
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    {user.profileName} · {user.jobTitle}
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-2xl border bg-white/65 px-3 py-2 text-sm dark:bg-white/6">
                <span className="text-[color:var(--muted-foreground)]">Estado</span>
                <select
                  value={experienceState}
                  onChange={(event) => setExperienceState(event.target.value as typeof experienceState)}
                  className="bg-transparent font-medium"
                >
                  <option value="ready">Pronto</option>
                  <option value="loading">Loading</option>
                  <option value="error">Erro</option>
                  <option value="empty">Vazio</option>
                </select>
              </label>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl border bg-white/65 px-4 py-2 text-sm font-medium hover:bg-white dark:bg-white/6"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-8">{children}</main>

        {notificationsOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/22 backdrop-blur-sm" onClick={() => setNotificationsOpen(false)}>
            <aside
              className="glass absolute right-4 top-24 w-[min(92vw,420px)] rounded-[2rem] border p-5 shadow-[0_30px_90px_rgba(10,21,38,0.18)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">Notificações</h2>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="rounded-full border px-3 py-1 text-sm"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {notifications.map((item) => (
                  <article key={item.id} className="rounded-3xl border bg-white/65 p-4 dark:bg-white/6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">{item.description}</p>
                      </div>
                      <span
                        className={cn(
                          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                          item.tone === "warning" && "bg-[color:var(--warning)]",
                          item.tone === "info" && "bg-[color:var(--primary)]",
                          item.tone === "success" && "bg-[color:var(--success)]",
                        )}
                      />
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{item.time}</p>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        )}

        {commandOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/26 backdrop-blur-sm" onClick={() => setCommandOpen(false)}>
            <div className="mx-auto mt-24 w-[min(92vw,640px)]" onClick={(event) => event.stopPropagation()}>
              <Command className="glass overflow-hidden rounded-[2rem] border shadow-[0_30px_80px_rgba(10,21,38,0.18)]">
                <div className="flex items-center gap-3 border-b px-4 py-4">
                  <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
                  <Command.Input
                    autoFocus
                    placeholder="Buscar módulo, rota ou ação rápida..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
                  />
                </div>

                <Command.List className="max-h-[420px] overflow-y-auto p-3">
                  <Command.Empty className="px-3 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
                    Nenhum resultado encontrado.
                  </Command.Empty>

                  <Command.Group heading="Módulos" className="text-sm">
                    {navItems.map((item) => (
                      <Command.Item
                        key={item.href}
                        value={`${item.label} ${item.group}`}
                        onSelect={() => {
                          router.push(item.href);
                          setCommandOpen(false);
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-3 data-[selected=true]:bg-[color:var(--accent)]"
                      >
                        <span>{item.label}</span>
                        <span className="text-xs text-[color:var(--muted-foreground)]">{item.group}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </Command.List>
              </Command>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

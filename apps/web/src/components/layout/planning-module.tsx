"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  CheckCircle2,
  Compass,
  Link2,
  Pencil,
  Plus,
  Rocket,
  Search,
  Trash2,
  WalletCards,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cn, formatCurrency, formatDate, slugifyLabel } from "@/lib/utils";
import { usePlanningStore } from "@/stores/planning-store";
import type {
  AppUser,
  DigitalStrategy,
  LaunchPlan,
  PageConfig,
  PlanningScheduleItem,
} from "@/types/flow";

const strategyStatuses = ["Rascunho", "Em validacao", "Aprovada", "Arquivada"] as const;
const launchPhases = ["Planejamento", "Captacao", "Aquecimento", "Lancamento", "Pos-lancamento"] as const;
const launchStatuses = ["Planejado", "Em andamento", "Pausado", "Concluido"] as const;
const scheduleStatuses = ["Pendente", "Em andamento", "Bloqueado", "Concluido"] as const;
const schedulePriorities = ["Alta", "Media", "Baixa"] as const;

const strategySchema = z.object({
  name: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres."),
  objective: z.string().trim().min(10, "Descreva o objetivo da estrategia."),
  audience: z.string().trim().min(10, "Descreva o publico principal."),
  promise: z.string().trim().min(10, "Descreva a promessa central."),
  channels: z.string().trim().min(2, "Informe pelo menos um canal."),
  owner: z.string().trim().min(2, "Informe o responsavel."),
  status: z.enum(strategyStatuses),
});

const launchSchema = z
  .object({
    name: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres."),
    strategyId: z.string().min(1, "Selecione a estrategia vinculada."),
    product: z.string().trim().min(3, "Informe o produto ou oferta."),
    owner: z.string().trim().min(2, "Informe o responsavel."),
    phase: z.enum(launchPhases),
    status: z.enum(launchStatuses),
    startDate: z.string().min(1, "Informe a data inicial."),
    endDate: z.string().min(1, "Informe a data final."),
    revenueGoal: z.number().min(0, "A meta nao pode ser negativa."),
    budget: z.number().min(0, "O orcamento nao pode ser negativo."),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: "A data final deve ser igual ou posterior a data inicial.",
    path: ["endDate"],
  })
  .refine((values) => values.budget <= values.revenueGoal, {
    message: "O orcamento nao pode superar a meta de receita.",
    path: ["budget"],
  });

const scheduleSchema = z
  .object({
    title: z.string().trim().min(3, "Informe um titulo com pelo menos 3 caracteres."),
    launchId: z.string().min(1, "Selecione o lancamento vinculado."),
    owner: z.string().trim().min(2, "Informe o responsavel."),
    squad: z.string().trim().min(2, "Informe a squad responsavel."),
    startDate: z.string().min(1, "Informe a data inicial."),
    endDate: z.string().min(1, "Informe a data final."),
    status: z.enum(scheduleStatuses),
    priority: z.enum(schedulePriorities),
    dependencyId: z.string(),
    notes: z.string().trim().max(500, "Use no maximo 500 caracteres."),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: "A data final deve ser igual ou posterior a data inicial.",
    path: ["endDate"],
  });

type StrategyFormValues = z.infer<typeof strategySchema>;
type LaunchFormValues = z.infer<typeof launchSchema>;
type ScheduleFormValues = z.infer<typeof scheduleSchema>;
type EditorMode = "create" | "edit";

const inputClass = "rounded-2xl border bg-white/75 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-65 dark:bg-white/6";

const labelMap: Record<string, string> = {
  "Em validacao": "Em validação",
  Captacao: "Captação",
  Lancamento: "Lançamento",
  "Pos-lancamento": "Pós-lançamento",
  Concluido: "Concluído",
  Media: "Média",
};

function displayLabel(value: string) {
  return labelMap[value] ?? value;
}

function createPlanningId(prefix: string, name: string, existingIds: string[]) {
  const base = `${prefix}-${slugifyLabel(name) || "item"}`;
  let candidate = base;
  let suffix = 2;

  while (existingIds.includes(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function statusClass(status: string) {
  if (["Aprovada", "Concluido"].includes(status)) {
    return "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300";
  }

  if (["Bloqueado", "Pausado"].includes(status)) {
    return "bg-rose-500/14 text-rose-700 dark:text-rose-300";
  }

  if (["Em validacao", "Pendente", "Planejado"].includes(status)) {
    return "bg-amber-500/14 text-amber-700 dark:text-amber-300";
  }

  return "bg-[color:var(--primary)]/12 text-[color:var(--primary)]";
}

function StatusBadge({ status }: { status: string }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusClass(status))}>{displayLabel(status)}</span>;
}

function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      <span className="min-h-4 text-xs font-normal text-[color:var(--danger)]">{error}</span>
    </label>
  );
}

function EmptyCollection({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed bg-white/45 p-8 text-center dark:bg-white/4">
      <CheckCircle2 className="mx-auto h-7 w-7 text-[color:var(--primary)]" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
    </div>
  );
}

function ConfirmDeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 px-5 py-3 font-semibold text-rose-600"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
      >
        Confirmar exclusão
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-2xl border px-4 py-3 text-sm font-semibold">
        Cancelar
      </button>
    </div>
  );
}

const planningLinks = [
  { href: "/estrategias", label: "Estratégias", icon: Compass },
  { href: "/lancamentos", label: "Lançamentos", icon: Rocket },
  { href: "/cronogramas", label: "Cronogramas", icon: CalendarDays },
];

function PlanningHero({
  page,
  path,
  canManage,
  actionLabel,
  onAction,
  metrics,
}: {
  page: PageConfig;
  path: string;
  canManage: boolean;
  actionLabel: string;
  onAction: () => void;
  metrics: Array<{ label: string; value: string; description: string }>;
}) {
  const iconByPath = path === "/estrategias" ? Compass : path === "/lancamentos" ? Rocket : CalendarDays;
  const Icon = iconByPath;

  return (
    <div className={cn("glass overflow-hidden rounded-[2rem] border", `bg-gradient-to-br ${page.accent}`)}>
      <div className="p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/60 px-3 py-1.5 text-sm dark:bg-white/8">
              <Icon className="h-4 w-4" />
              Planejamento integrado
            </div>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">{page.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)] sm:text-base">{page.description}</p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-semibold text-[color:var(--primary-foreground)] shadow-lg shadow-[color:var(--primary)]/15"
            >
              <Plus className="h-4 w-4" />
              {actionLabel}
            </button>
          )}
        </div>

        <nav className="mt-7 flex flex-wrap gap-2" aria-label="Módulos de planejamento">
          {planningLinks.map((item) => {
            const LinkIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                  path === item.href
                    ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                    : "bg-white/65 hover:border-[color:var(--primary)]/35 dark:bg-white/6",
                )}
              >
                <LinkIcon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-[1.6rem] border bg-white/65 p-4 dark:bg-white/6">
              <p className="text-sm text-[color:var(--muted-foreground)]">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlanningModule({ page, path, user }: { page: PageConfig; path: string; user: AppUser }) {
  const canManage = ["admin", "strategist", "operations"].includes(user.role);

  if (path === "/estrategias") {
    return <StrategiesModule page={page} path={path} canManage={canManage} />;
  }

  if (path === "/lancamentos") {
    return <LaunchesModule page={page} path={path} canManage={canManage} />;
  }

  return <SchedulesModule page={page} path={path} canManage={canManage} />;
}

function StrategiesModule({ page, path, canManage }: { page: PageConfig; path: string; canManage: boolean }) {
  const strategies = usePlanningStore((state) => state.strategies);
  const launches = usePlanningStore((state) => state.launches);
  const addStrategy = usePlanningStore((state) => state.addStrategy);
  const updateStrategy = usePlanningStore((state) => state.updateStrategy);
  const deleteStrategy = usePlanningStore((state) => state.deleteStrategy);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [selectedId, setSelectedId] = useState(strategies[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const selected = strategies.find((strategy) => strategy.id === selectedId);

  const visibleStrategies = useMemo(
    () =>
      strategies.filter((strategy) => {
        const matchesStatus = statusFilter === "Todos" || strategy.status === statusFilter;
        const term = search.trim().toLowerCase();
        const matchesSearch =
          term === "" ||
          [strategy.name, strategy.objective, strategy.audience, strategy.owner, ...strategy.channels].some((value) =>
            value.toLowerCase().includes(term),
          );
        return matchesStatus && matchesSearch;
      }),
    [search, statusFilter, strategies],
  );

  function saveStrategy(values: StrategyFormValues) {
    const duplicate = strategies.some(
      (strategy) => strategy.id !== selected?.id && strategy.name.toLowerCase() === values.name.toLowerCase(),
    );

    if (duplicate) {
      toast.error("Ja existe uma estrategia com este nome.");
      return;
    }

    const channels = values.channels.split(",").map((channel) => channel.trim()).filter(Boolean);

    if (mode === "edit" && selected) {
      updateStrategy(selected.id, { ...values, channels });
      toast.success(`Estrategia ${values.name} atualizada.`);
      return;
    }

    const strategy: DigitalStrategy = {
      id: createPlanningId("strategy", values.name, strategies.map((item) => item.id)),
      ...values,
      channels,
    };
    addStrategy(strategy);
    setSelectedId(strategy.id);
    setMode("edit");
    toast.success(`Estrategia ${strategy.name} cadastrada.`);
  }

  function removeStrategy(strategy: DigitalStrategy) {
    const linkedLaunches = launches.filter((launch) => launch.strategyId === strategy.id);
    if (linkedLaunches.length > 0) {
      toast.error(`A estrategia possui ${linkedLaunches.length} lancamento(s) vinculado(s). Reorganize-os antes de excluir.`);
      return;
    }

    deleteStrategy(strategy.id);
    setSelectedId("");
    setMode("create");
    toast.success("Estrategia excluida com sucesso.");
  }

  return (
    <section className="page-grid">
      <PlanningHero
        page={page}
        path={path}
        canManage={canManage}
        actionLabel="Nova estratégia"
        onAction={() => setMode("create")}
        metrics={[
          { label: "Estratégias ativas", value: `${strategies.filter((item) => item.status !== "Arquivada").length}`, description: "Planejamentos disponíveis" },
          { label: "Aprovadas", value: `${strategies.filter((item) => item.status === "Aprovada").length}`, description: "Prontas para execução" },
          { label: "Lançamentos vinculados", value: `${launches.length}`, description: "Ondas conectadas às estratégias" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass rounded-[2rem] border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">Mapa estratégico</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Selecione uma estratégia para administrar seus detalhes.</p>
            </div>
            <span className="rounded-full bg-[color:var(--secondary)] px-3 py-1.5 text-xs font-semibold">{visibleStrategies.length} registros</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[color:var(--muted-foreground)]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar estratégia..." className={cn(inputClass, "w-full pl-10 py-2.5")} />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={cn(inputClass, "py-2.5")} aria-label="Filtrar estratégia por status">
              <option value="Todos">Todos os status</option>
              {strategyStatuses.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {visibleStrategies.map((strategy) => (
              <button
                key={strategy.id}
                type="button"
                onClick={() => { setSelectedId(strategy.id); setMode("edit"); }}
                className={cn(
                  "w-full rounded-3xl border p-4 text-left transition",
                  mode === "edit" && selectedId === strategy.id
                    ? "border-[color:var(--primary)] bg-[color:var(--primary)]/7"
                    : "bg-white/65 hover:border-[color:var(--primary)]/30 dark:bg-white/5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{strategy.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[color:var(--muted-foreground)]">{strategy.objective}</p>
                  </div>
                  <StatusBadge status={strategy.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--muted-foreground)]">
                  <span>{strategy.owner}</span>
                  <span>•</span>
                  <span>{launches.filter((launch) => launch.strategyId === strategy.id).length} lançamentos</span>
                </div>
              </button>
            ))}
            {visibleStrategies.length === 0 && <EmptyCollection title="Nenhuma estratégia encontrada" description="Ajuste os filtros ou cadastre uma nova estratégia." />}
          </div>
        </div>

        <StrategyForm
          key={mode === "create" ? "new-strategy" : selected?.id ?? "strategy-empty"}
          initial={mode === "edit" ? selected : undefined}
          canManage={canManage}
          onSave={saveStrategy}
          onDelete={selected ? () => removeStrategy(selected) : undefined}
        />
      </div>
    </section>
  );
}

function StrategyForm({ initial, canManage, onSave, onDelete }: { initial?: DigitalStrategy; canManage: boolean; onSave: (values: StrategyFormValues) => void; onDelete?: () => void }) {
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategySchema),
    defaultValues: initial
      ? { ...initial, channels: initial.channels.join(", ") }
      : { name: "", objective: "", audience: "", promise: "", channels: "Instagram, Email", owner: "", status: "Rascunho" },
  });

  return (
    <div className="glass rounded-[2rem] border p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[color:var(--primary)]/12 p-3 text-[color:var(--primary)]">{initial ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}</div>
        <div>
          <h3 className="font-display text-xl font-semibold">{initial ? "Editar estratégia" : "Cadastrar estratégia"}</h3>
          <p className="text-sm text-[color:var(--muted-foreground)]">{canManage ? "Estruture posicionamento, audiência e direção de canais." : "Visualização consultiva do planejamento estratégico."}</p>
        </div>
      </div>

      <form data-testid="strategy-form" onSubmit={form.handleSubmit(onSave)} className="mt-6 grid gap-4 md:grid-cols-2">
        <FormField label="Nome da estratégia" error={form.formState.errors.name?.message}>
          <input {...form.register("name")} disabled={!canManage} className={inputClass} placeholder="Ex: Campanha de posicionamento" />
        </FormField>
        <FormField label="Responsável" error={form.formState.errors.owner?.message}>
          <input {...form.register("owner")} disabled={!canManage} className={inputClass} placeholder="Nome do estrategista" />
        </FormField>
        <div className="md:col-span-2"><FormField label="Objetivo de negócio" error={form.formState.errors.objective?.message}><textarea {...form.register("objective")} disabled={!canManage} className={cn(inputClass, "min-h-24")} placeholder="Qual resultado esta estratégia precisa gerar?" /></FormField></div>
        <div className="md:col-span-2"><FormField label="Público principal" error={form.formState.errors.audience?.message}><textarea {...form.register("audience")} disabled={!canManage} className={cn(inputClass, "min-h-24")} placeholder="Quem queremos mobilizar e quais dores existem?" /></FormField></div>
        <div className="md:col-span-2"><FormField label="Promessa central" error={form.formState.errors.promise?.message}><textarea {...form.register("promise")} disabled={!canManage} className={cn(inputClass, "min-h-24")} placeholder="Qual transformação será comunicada?" /></FormField></div>
        <FormField label="Canais (separados por vírgula)" error={form.formState.errors.channels?.message}>
          <input {...form.register("channels")} disabled={!canManage} className={inputClass} placeholder="Instagram, YouTube, Email" />
        </FormField>
        <FormField label="Status" error={form.formState.errors.status?.message}>
          <select {...form.register("status")} disabled={!canManage} className={inputClass}>{strategyStatuses.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}</select>
        </FormField>
        {canManage && (
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-semibold text-[color:var(--primary-foreground)]"><CheckCircle2 className="h-4 w-4" />{initial ? "Salvar estratégia" : "Cadastrar estratégia"}</button>
            {initial && onDelete && <ConfirmDeleteButton onConfirm={onDelete} />}
          </div>
        )}
      </form>
    </div>
  );
}

function LaunchesModule({ page, path, canManage }: { page: PageConfig; path: string; canManage: boolean }) {
  const strategies = usePlanningStore((state) => state.strategies);
  const launches = usePlanningStore((state) => state.launches);
  const scheduleItems = usePlanningStore((state) => state.scheduleItems);
  const addLaunch = usePlanningStore((state) => state.addLaunch);
  const updateLaunch = usePlanningStore((state) => state.updateLaunch);
  const deleteLaunch = usePlanningStore((state) => state.deleteLaunch);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [selectedId, setSelectedId] = useState(launches[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [strategyFilter, setStrategyFilter] = useState("Todas");
  const selected = launches.find((launch) => launch.id === selectedId);

  const visibleLaunches = useMemo(
    () => launches.filter((launch) => {
      const strategy = strategies.find((item) => item.id === launch.strategyId);
      const term = search.trim().toLowerCase();
      return (statusFilter === "Todos" || launch.status === statusFilter)
        && (strategyFilter === "Todas" || launch.strategyId === strategyFilter)
        && (term === "" || [launch.name, launch.product, launch.owner, strategy?.name ?? ""].some((value) => value.toLowerCase().includes(term)));
    }),
    [launches, search, statusFilter, strategies, strategyFilter],
  );

  function saveLaunch(values: LaunchFormValues) {
    if (launches.some((launch) => launch.id !== selected?.id && launch.name.toLowerCase() === values.name.toLowerCase())) {
      toast.error("Ja existe um lancamento com este nome.");
      return;
    }

    if (mode === "edit" && selected) {
      const outsideRange = scheduleItems.some((item) => item.launchId === selected.id && (item.startDate < values.startDate || item.endDate > values.endDate));
      if (outsideRange) {
        toast.error("Existem itens do cronograma fora do novo periodo. Ajuste o cronograma antes de reduzir as datas.");
        return;
      }
      updateLaunch(selected.id, values);
      toast.success(`Lancamento ${values.name} atualizado.`);
      return;
    }

    const launch: LaunchPlan = {
      id: createPlanningId("launch", values.name, launches.map((item) => item.id)),
      ...values,
    };
    addLaunch(launch);
    setSelectedId(launch.id);
    setMode("edit");
    toast.success(`Lancamento ${launch.name} cadastrado.`);
  }

  function removeLaunch(launch: LaunchPlan) {
    const linkedItems = scheduleItems.filter((item) => item.launchId === launch.id);
    if (linkedItems.length > 0) {
      toast.error(`O lancamento possui ${linkedItems.length} item(ns) no cronograma. Remova-os antes de excluir.`);
      return;
    }
    deleteLaunch(launch.id);
    setSelectedId("");
    setMode("create");
    toast.success("Lancamento excluido com sucesso.");
  }

  return (
    <section className="page-grid">
      <PlanningHero
        page={page}
        path={path}
        canManage={canManage && strategies.length > 0}
        actionLabel="Novo lançamento"
        onAction={() => setMode("create")}
        metrics={[
          { label: "Lançamentos ativos", value: `${launches.filter((item) => !["Concluido", "Pausado"].includes(item.status)).length}`, description: "Planejados ou em execução" },
          { label: "Meta de receita", value: formatCurrency(launches.reduce((total, item) => total + item.revenueGoal, 0)), description: "Somatório do portfólio" },
          { label: "Orçamento", value: formatCurrency(launches.reduce((total, item) => total + item.budget, 0)), description: "Investimento planejado" },
        ]}
      />

      <div className="glass rounded-[2rem] border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-display text-xl font-semibold">Portfólio de lançamentos</h3><p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Controle fase, período, metas e vínculo estratégico de cada onda.</p></div>
          <span className="rounded-full bg-[color:var(--secondary)] px-3 py-1.5 text-xs font-semibold">{visibleLaunches.length} registros</span>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-3">
          <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[color:var(--muted-foreground)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={cn(inputClass, "w-full pl-10")} placeholder="Buscar lançamento..." /></div>
          <select value={strategyFilter} onChange={(event) => setStrategyFilter(event.target.value)} className={inputClass} aria-label="Filtrar por estratégia"><option value="Todas">Todas as estratégias</option>{strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass} aria-label="Filtrar lançamento por status"><option value="Todos">Todos os status</option>{launchStatuses.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}</select>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visibleLaunches.map((launch) => {
            const strategy = strategies.find((item) => item.id === launch.strategyId);
            const completed = scheduleItems.filter((item) => item.launchId === launch.id && item.status === "Concluido").length;
            const total = scheduleItems.filter((item) => item.launchId === launch.id).length;
            const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
            return (
              <button key={launch.id} type="button" onClick={() => { setSelectedId(launch.id); setMode("edit"); }} className={cn("rounded-[1.75rem] border bg-white/65 p-5 text-left transition hover:border-[color:var(--primary)]/35 dark:bg-white/5", mode === "edit" && selectedId === launch.id && "border-[color:var(--primary)] bg-[color:var(--primary)]/6")}>
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{launch.name}</p><p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{launch.product}</p></div><StatusBadge status={launch.status} /></div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--primary)]">{displayLabel(launch.phase)}</p>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{strategy?.name ?? "Estratégia não encontrada"}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--secondary)]"><div className="h-full rounded-full bg-[color:var(--primary)]" style={{ width: `${progress}%` }} /></div>
                <div className="mt-2 flex justify-between text-xs text-[color:var(--muted-foreground)]"><span>{progress}% do cronograma</span><span>{formatDate(launch.startDate)} – {formatDate(launch.endDate)}</span></div>
              </button>
            );
          })}
          {visibleLaunches.length === 0 && <div className="lg:col-span-2 xl:col-span-3"><EmptyCollection title="Nenhum lançamento encontrado" description="Ajuste os filtros ou cadastre uma nova onda de lançamento." /></div>}
        </div>
      </div>

      {strategies.length === 0 ? (
        <EmptyCollection title="Cadastre uma estratégia primeiro" description="Todo lançamento precisa estar ligado a uma estratégia digital válida." />
      ) : (
        <LaunchForm
          key={mode === "create" ? "new-launch" : selected?.id ?? "launch-empty"}
          initial={mode === "edit" ? selected : undefined}
          strategies={strategies}
          canManage={canManage}
          onSave={saveLaunch}
          onDelete={selected ? () => removeLaunch(selected) : undefined}
        />
      )}
    </section>
  );
}

function LaunchForm({ initial, strategies, canManage, onSave, onDelete }: { initial?: LaunchPlan; strategies: DigitalStrategy[]; canManage: boolean; onSave: (values: LaunchFormValues) => void; onDelete?: () => void }) {
  const form = useForm<LaunchFormValues>({
    resolver: zodResolver(launchSchema),
    defaultValues: initial ?? { name: "", strategyId: strategies[0]?.id ?? "", product: "", owner: "", phase: "Planejamento", status: "Planejado", startDate: "2026-07-15", endDate: "2026-08-15", revenueGoal: 0, budget: 0 },
  });

  return (
    <div className="glass rounded-[2rem] border p-6">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-[color:var(--primary)]/12 p-3 text-[color:var(--primary)]">{initial ? <Pencil className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}</div><div><h3 className="font-display text-xl font-semibold">{initial ? "Editar lançamento" : "Cadastrar lançamento"}</h3><p className="text-sm text-[color:var(--muted-foreground)]">Planeje oferta, janela, metas e fase operacional.</p></div></div>
      <form data-testid="launch-form" onSubmit={form.handleSubmit(onSave)} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FormField label="Nome do lançamento" error={form.formState.errors.name?.message}><input {...form.register("name")} disabled={!canManage} className={inputClass} placeholder="Ex: Turma Setembro" /></FormField>
        <FormField label="Produto ou oferta" error={form.formState.errors.product?.message}><input {...form.register("product")} disabled={!canManage} className={inputClass} placeholder="Produto principal" /></FormField>
        <FormField label="Estratégia vinculada" error={form.formState.errors.strategyId?.message}><select {...form.register("strategyId")} disabled={!canManage} className={inputClass}>{strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}</select></FormField>
        <FormField label="Responsável" error={form.formState.errors.owner?.message}><input {...form.register("owner")} disabled={!canManage} className={inputClass} placeholder="Líder do lançamento" /></FormField>
        <FormField label="Fase" error={form.formState.errors.phase?.message}><select {...form.register("phase")} disabled={!canManage} className={inputClass}>{launchPhases.map((phase) => <option key={phase} value={phase}>{displayLabel(phase)}</option>)}</select></FormField>
        <FormField label="Status" error={form.formState.errors.status?.message}><select {...form.register("status")} disabled={!canManage} className={inputClass}>{launchStatuses.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}</select></FormField>
        <FormField label="Data inicial" error={form.formState.errors.startDate?.message}><input type="date" {...form.register("startDate")} disabled={!canManage} className={inputClass} /></FormField>
        <FormField label="Data final" error={form.formState.errors.endDate?.message}><input type="date" {...form.register("endDate")} disabled={!canManage} className={inputClass} /></FormField>
        <FormField label="Meta de receita" error={form.formState.errors.revenueGoal?.message}><input type="number" min={0} step={1000} {...form.register("revenueGoal", { valueAsNumber: true })} disabled={!canManage} className={inputClass} /></FormField>
        <FormField label="Orçamento" error={form.formState.errors.budget?.message}><input type="number" min={0} step={1000} {...form.register("budget", { valueAsNumber: true })} disabled={!canManage} className={inputClass} /></FormField>
        {canManage && <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4"><button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-semibold text-[color:var(--primary-foreground)]"><CheckCircle2 className="h-4 w-4" />{initial ? "Salvar lançamento" : "Cadastrar lançamento"}</button>{initial && onDelete && <ConfirmDeleteButton onConfirm={onDelete} />}</div>}
      </form>
    </div>
  );
}

function SchedulesModule({ page, path, canManage }: { page: PageConfig; path: string; canManage: boolean }) {
  const launches = usePlanningStore((state) => state.launches);
  const scheduleItems = usePlanningStore((state) => state.scheduleItems);
  const addScheduleItem = usePlanningStore((state) => state.addScheduleItem);
  const updateScheduleItem = usePlanningStore((state) => state.updateScheduleItem);
  const deleteScheduleItem = usePlanningStore((state) => state.deleteScheduleItem);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [selectedId, setSelectedId] = useState(scheduleItems[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [launchFilter, setLaunchFilter] = useState("Todos");
  const selected = scheduleItems.find((item) => item.id === selectedId);

  const visibleItems = useMemo(
    () => scheduleItems.filter((item) => {
      const launch = launches.find((entry) => entry.id === item.launchId);
      const term = search.trim().toLowerCase();
      return (statusFilter === "Todos" || item.status === statusFilter)
        && (launchFilter === "Todos" || item.launchId === launchFilter)
        && (term === "" || [item.title, item.owner, item.squad, launch?.name ?? ""].some((value) => value.toLowerCase().includes(term)));
    }).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [launchFilter, launches, scheduleItems, search, statusFilter],
  );

  function saveScheduleItem(values: ScheduleFormValues) {
    const launch = launches.find((entry) => entry.id === values.launchId);
    if (!launch) {
      toast.error("Selecione um lancamento valido.");
      return;
    }
    if (values.startDate < launch.startDate || values.endDate > launch.endDate) {
      toast.error(`O item deve estar entre ${formatDate(launch.startDate)} e ${formatDate(launch.endDate)}.`);
      return;
    }
    const dependency = scheduleItems.find((item) => item.id === values.dependencyId);
    if (dependency && dependency.launchId !== values.launchId) {
      toast.error("A dependencia precisa pertencer ao mesmo lancamento.");
      return;
    }
    if (mode === "edit" && selected) {
      const hasDependents = scheduleItems.some((item) => item.dependencyId === selected.id);
      if (hasDependents && selected.launchId !== values.launchId) {
        toast.error("Este item possui dependentes e nao pode ser movido para outro lancamento.");
        return;
      }
      updateScheduleItem(selected.id, values);
      toast.success(`Item ${values.title} atualizado.`);
      return;
    }

    const item: PlanningScheduleItem = {
      id: createPlanningId("schedule", values.title, scheduleItems.map((entry) => entry.id)),
      ...values,
    };
    addScheduleItem(item);
    setSelectedId(item.id);
    setMode("edit");
    toast.success(`Item ${item.title} cadastrado no cronograma.`);
  }

  function removeScheduleItem(item: PlanningScheduleItem) {
    const dependents = scheduleItems.filter((entry) => entry.dependencyId === item.id);
    if (dependents.length > 0) {
      toast.error(`O item possui ${dependents.length} dependencia(s) vinculada(s). Reorganize-as antes de excluir.`);
      return;
    }
    deleteScheduleItem(item.id);
    setSelectedId("");
    setMode("create");
    toast.success("Item excluido do cronograma.");
  }

  const completed = scheduleItems.filter((item) => item.status === "Concluido").length;
  const completion = scheduleItems.length === 0 ? 0 : Math.round((completed / scheduleItems.length) * 100);

  return (
    <section className="page-grid">
      <PlanningHero
        page={page}
        path={path}
        canManage={canManage && launches.length > 0}
        actionLabel="Novo item"
        onAction={() => setMode("create")}
        metrics={[
          { label: "Itens planejados", value: `${scheduleItems.length}`, description: "Entregas em todos os lançamentos" },
          { label: "Conclusão", value: `${completion}%`, description: `${completed} itens finalizados` },
          { label: "Bloqueios", value: `${scheduleItems.filter((item) => item.status === "Bloqueado").length}`, description: "Dependências que exigem atenção" },
        ]}
      />

      <div className="glass rounded-[2rem] border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-xl font-semibold">Cronograma consolidado</h3><p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Visualize prazos, squads, prioridades e dependências entre entregas.</p></div><span className="rounded-full bg-[color:var(--secondary)] px-3 py-1.5 text-xs font-semibold">{visibleItems.length} entregas</span></div>
        <div className="mt-5 grid gap-2 md:grid-cols-3">
          <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[color:var(--muted-foreground)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={cn(inputClass, "w-full pl-10")} placeholder="Buscar entrega..." /></div>
          <select value={launchFilter} onChange={(event) => setLaunchFilter(event.target.value)} className={inputClass} aria-label="Filtrar cronograma por lançamento"><option value="Todos">Todos os lançamentos</option>{launches.map((launch) => <option key={launch.id} value={launch.id}>{launch.name}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass} aria-label="Filtrar cronograma por status"><option value="Todos">Todos os status</option>{scheduleStatuses.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}</select>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="text-[color:var(--muted-foreground)]">{["Entrega", "Lançamento", "Período", "Squad", "Prioridade", "Status", "Dependência"].map((column) => <th key={column} className="pb-4 pr-4 font-medium">{column}</th>)}</tr></thead>
            <tbody>{visibleItems.map((item) => {
              const launch = launches.find((entry) => entry.id === item.launchId);
              const dependency = scheduleItems.find((entry) => entry.id === item.dependencyId);
              return <tr key={item.id} className={cn("border-t transition hover:bg-[color:var(--primary)]/4", mode === "edit" && selectedId === item.id && "bg-[color:var(--primary)]/5")}>
                <td className="py-4 pr-4"><button type="button" onClick={() => { setSelectedId(item.id); setMode("edit"); }} className="text-left"><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{item.owner}</p></button></td>
                <td className="py-4 pr-4">{launch?.name ?? "Não encontrado"}</td><td className="whitespace-nowrap py-4 pr-4">{formatDate(item.startDate)} – {formatDate(item.endDate)}</td><td className="py-4 pr-4">{item.squad}</td><td className="py-4 pr-4">{displayLabel(item.priority)}</td><td className="py-4 pr-4"><StatusBadge status={item.status} /></td><td className="py-4 pr-4 text-[color:var(--muted-foreground)]">{dependency?.title ?? "Sem dependência"}</td>
              </tr>;
            })}</tbody>
          </table>
          {visibleItems.length === 0 && <EmptyCollection title="Nenhuma entrega encontrada" description="Ajuste os filtros ou cadastre um novo item no cronograma." />}
        </div>
      </div>

      {launches.length === 0 ? (
        <EmptyCollection title="Cadastre um lançamento primeiro" description="O cronograma precisa de pelo menos um lançamento com período definido." />
      ) : (
        <ScheduleForm key={mode === "create" ? "new-schedule" : selected?.id ?? "schedule-empty"} initial={mode === "edit" ? selected : undefined} launches={launches} scheduleItems={scheduleItems} canManage={canManage} onSave={saveScheduleItem} onDelete={selected ? () => removeScheduleItem(selected) : undefined} />
      )}

      <div className="glass rounded-[2rem] border p-6">
        <div className="flex items-center gap-3"><Workflow className="h-5 w-5 text-[color:var(--primary)]" /><div><h3 className="font-display text-xl font-semibold">Fluxo por status</h3><p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Leitura rápida da distribuição das entregas no planejamento.</p></div></div>
        <div className="mt-6 grid gap-4 xl:grid-cols-4">{scheduleStatuses.map((status) => <div key={status} className="rounded-[1.6rem] border bg-white/50 p-4 dark:bg-white/4"><div className="flex items-center justify-between"><p className="font-semibold">{displayLabel(status)}</p><span className="rounded-full bg-[color:var(--secondary)] px-2.5 py-1 text-xs">{scheduleItems.filter((item) => item.status === status).length}</span></div><div className="mt-4 space-y-3">{scheduleItems.filter((item) => item.status === status).map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setMode("edit"); }} className="w-full rounded-2xl border bg-white/75 p-3 text-left text-sm dark:bg-white/6"><p className="font-medium">{item.title}</p><p className="mt-2 text-xs text-[color:var(--muted-foreground)]">{item.squad} · {formatDate(item.endDate)}</p></button>)}</div></div>)}</div>
      </div>
    </section>
  );
}

function ScheduleForm({ initial, launches, scheduleItems, canManage, onSave, onDelete }: { initial?: PlanningScheduleItem; launches: LaunchPlan[]; scheduleItems: PlanningScheduleItem[]; canManage: boolean; onSave: (values: ScheduleFormValues) => void; onDelete?: () => void }) {
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: initial ?? { title: "", launchId: launches[0]?.id ?? "", owner: "", squad: "", startDate: launches[0]?.startDate ?? "2026-07-15", endDate: launches[0]?.startDate ?? "2026-07-15", status: "Pendente", priority: "Media", dependencyId: "", notes: "" },
  });
  const selectedLaunchId = useWatch({ control: form.control, name: "launchId" });
  const dependencies = scheduleItems.filter((item) => item.launchId === selectedLaunchId && item.id !== initial?.id);

  return (
    <div className="glass rounded-[2rem] border p-6">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-[color:var(--primary)]/12 p-3 text-[color:var(--primary)]">{initial ? <Pencil className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}</div><div><h3 className="font-display text-xl font-semibold">{initial ? "Editar item do cronograma" : "Cadastrar item no cronograma"}</h3><p className="text-sm text-[color:var(--muted-foreground)]">Organize responsáveis, prazos e dependências do lançamento.</p></div></div>
      <form data-testid="schedule-form" onSubmit={form.handleSubmit(onSave)} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2"><FormField label="Título da entrega" error={form.formState.errors.title?.message}><input {...form.register("title")} disabled={!canManage} className={inputClass} placeholder="Ex: Aprovar sequência de emails" /></FormField></div>
        <div className="md:col-span-2"><FormField label="Lançamento" error={form.formState.errors.launchId?.message}><select {...form.register("launchId")} disabled={!canManage} className={inputClass}>{launches.map((launch) => <option key={launch.id} value={launch.id}>{launch.name}</option>)}</select></FormField></div>
        <FormField label="Responsável" error={form.formState.errors.owner?.message}><input {...form.register("owner")} disabled={!canManage} className={inputClass} placeholder="Nome do responsável" /></FormField>
        <FormField label="Squad" error={form.formState.errors.squad?.message}><input {...form.register("squad")} disabled={!canManage} className={inputClass} placeholder="Ex: Conteúdo" /></FormField>
        <FormField label="Data inicial" error={form.formState.errors.startDate?.message}><input type="date" {...form.register("startDate")} disabled={!canManage} className={inputClass} /></FormField>
        <FormField label="Data final" error={form.formState.errors.endDate?.message}><input type="date" {...form.register("endDate")} disabled={!canManage} className={inputClass} /></FormField>
        <FormField label="Status" error={form.formState.errors.status?.message}><select {...form.register("status")} disabled={!canManage} className={inputClass}>{scheduleStatuses.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}</select></FormField>
        <FormField label="Prioridade" error={form.formState.errors.priority?.message}><select {...form.register("priority")} disabled={!canManage} className={inputClass}>{schedulePriorities.map((priority) => <option key={priority} value={priority}>{displayLabel(priority)}</option>)}</select></FormField>
        <div className="md:col-span-2"><FormField label="Depende de" error={form.formState.errors.dependencyId?.message}><select {...form.register("dependencyId")} disabled={!canManage} className={inputClass}><option value="">Sem dependência</option>{dependencies.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></FormField></div>
        <div className="md:col-span-2 xl:col-span-4"><FormField label="Observações" error={form.formState.errors.notes?.message}><textarea {...form.register("notes")} disabled={!canManage} className={cn(inputClass, "min-h-24")} placeholder="Contexto, critérios de conclusão e observações" /></FormField></div>
        {canManage && <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4"><button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-semibold text-[color:var(--primary-foreground)]"><CheckCircle2 className="h-4 w-4" />{initial ? "Salvar item" : "Cadastrar item"}</button>{initial && onDelete && <ConfirmDeleteButton onConfirm={onDelete} />}</div>}
      </form>
      <div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border bg-white/55 p-4 text-sm dark:bg-white/5"><Link2 className="h-4 w-4 text-[color:var(--primary)]" /><p className="mt-2 font-semibold">Dependências protegidas</p><p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">Itens dependentes impedem exclusões ou mudanças de lançamento.</p></div><div className="rounded-2xl border bg-white/55 p-4 text-sm dark:bg-white/5"><CalendarDays className="h-4 w-4 text-[color:var(--primary)]" /><p className="mt-2 font-semibold">Datas consistentes</p><p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">Entregas respeitam a janela do lançamento vinculado.</p></div><div className="rounded-2xl border bg-white/55 p-4 text-sm dark:bg-white/5"><WalletCards className="h-4 w-4 text-[color:var(--primary)]" /><p className="mt-2 font-semibold">Planejamento conectado</p><p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">Estratégia, lançamento e cronograma compartilham a mesma base.</p></div></div>
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BadgeCheck,
  CalendarRange,
  CheckCircle2,
  Clapperboard,
  Compass,
  LayoutDashboard,
  Lock,
  Megaphone,
  Radar,
  Rocket,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { z } from "zod";

import { userCanAccessPage } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getPageConfig, mockUsers } from "@/mocks/flow-data";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import type { AppUser, BoardColumn, BoardTask } from "@/types/flow";

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
};

const requestSchema = z.object({
  title: z.string().min(3, "Informe um título com pelo menos 3 caracteres."),
  owner: z.string().min(2, "Defina um responsável."),
  dueDate: z.string().min(1, "Defina um prazo."),
  priority: z.enum(["Alta", "Média", "Baixa"]),
});

type RequestForm = z.infer<typeof requestSchema>;

function SortableTaskCard({ task }: { task: BoardTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "rounded-3xl border bg-white/80 p-4 shadow-sm dark:bg-white/6",
        isDragging && "opacity-60 shadow-xl",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">{task.title}</h4>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{task.tag}</p>
        </div>
        <span className="rounded-full bg-[color:var(--secondary)] px-2.5 py-1 text-xs text-[color:var(--secondary-foreground)]">
          {task.owner}
        </span>
      </div>
      <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">Prazo {task.dueDate}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass rounded-[2rem] border p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[color:var(--primary)]/12 text-[color:var(--primary)]">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted-foreground)]">{description}</p>
    </div>
  );
}

export function ModulePage({ path }: { path: string }) {
  const currentUserId = useAuthStore((state) => state.currentUserId);
  const experienceState = useUiStore((state) => state.experienceState);
  const user = getCurrentUser(currentUserId);
  const initialPage = getPageConfig(path);
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [board, setBoard] = useState(initialPage.board);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const query = useQuery({
    queryKey: ["flow-page", path, experienceState],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));

      if (experienceState === "error") {
        throw new Error("Falha simulada ao consultar os dados do módulo.");
      }

      return getPageConfig(path);
    },
  });

  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      owner: user.name,
      dueDate: "2026-07-20",
      priority: "Média",
    },
  });

  const page = query.data ?? initialPage;
  const Icon = iconMap[page.icon as keyof typeof iconMap] ?? LayoutDashboard;
  const canAccess = userCanAccessPage(user, page);

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(new Date("2026-07-01")), { locale: ptBR }),
    end: endOfWeek(endOfMonth(new Date("2026-07-01")), { locale: ptBR }),
  });

  const filteredRows = page.table.rows.filter((row) => {
    const matchesTag = filter === "Todos" || row.status === filter;
    const matchesSearch = search === "" || Object.values(row).some((value) => value.toLowerCase().includes(search.toLowerCase()));

    return matchesTag && matchesSearch;
  });

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    if (!overId || activeId === overId) {
      return;
    }

    const sourceColumn = board.find((column) => column.tasks.some((task) => task.id === activeId));
    const targetColumn = board.find((column) => column.id === overId || column.tasks.some((task) => task.id === overId));

    if (!sourceColumn || !targetColumn) {
      return;
    }

    const movingTask = sourceColumn.tasks.find((task) => task.id === activeId);

    if (!movingTask) {
      return;
    }

    const nextBoard: BoardColumn[] = board.map((column) => {
      if (column.id === sourceColumn.id) {
        return {
          ...column,
          tasks: column.tasks.filter((task) => task.id !== activeId),
        };
      }

      if (column.id === targetColumn.id) {
        return {
          ...column,
          tasks: [...column.tasks, movingTask],
        };
      }

      return column;
    });

    setBoard(nextBoard);
    toast.success("Card movido com sucesso.");
  }

  if (!canAccess) {
    return (
      <section className="page-grid">
        <div className="glass rounded-[2rem] border p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[color:var(--danger)]/12 text-[color:var(--danger)]">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold">Acesso restrito neste perfil</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            O perfil atual de {user.roleLabel} não possui permissão simulada para visualizar este módulo. Troque o perfil na barra
            superior para validar outra combinação de permissões.
          </p>
        </div>
      </section>
    );
  }

  if (experienceState === "loading" || query.isLoading) {
    return (
      <section className="page-grid">
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="glass h-36 animate-pulse rounded-[2rem] border" />
          ))}
        </div>
        <div className="glass h-[380px] animate-pulse rounded-[2rem] border" />
        <div className="glass h-[340px] animate-pulse rounded-[2rem] border" />
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="page-grid">
        <div className="glass rounded-[2rem] border p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[color:var(--danger)]/12 text-[color:var(--danger)]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold">Falha ao carregar o módulo</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Este cenário foi preparado para simular estados de erro da interface. Volte o seletor de estado para Pronto para
            validar a experiência normal.
          </p>
        </div>
      </section>
    );
  }

  if (experienceState === "empty") {
    return (
      <EmptyState
        title={`Nenhum dado disponível em ${page.title}`}
        description="A interface já contempla o estado vazio para o módulo atual, permitindo evoluir a integração com a API sem perder consistência de experiência."
      />
    );
  }

  return (
    <section className="page-grid">
      <div className={cn("glass overflow-hidden rounded-[2rem] border", `bg-gradient-to-br ${page.accent}`)}>
        <div className="grid gap-5 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/60 px-3 py-1.5 text-sm text-[color:var(--accent-foreground)] dark:bg-white/8">
              <Icon className="h-4 w-4" />
              {page.path.replace("/", "") || "dashboard"}
            </div>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">{page.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)] sm:text-base">{page.description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              {page.actions.map((action) => (
                <div key={action.title} className="rounded-3xl border bg-white/70 px-4 py-3 dark:bg-white/8">
                  <p className="font-medium">{action.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{action.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {page.metrics.map((metric) => (
              <div key={metric.label} className="glass rounded-[1.75rem] border p-5">
                <p className="text-sm text-[color:var(--muted-foreground)]">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{metric.value}</p>
                <p
                  className={cn(
                    "mt-3 text-sm font-medium",
                    metric.tone === "primary" && "text-[color:var(--primary)]",
                    metric.tone === "success" && "text-[color:var(--success)]",
                    metric.tone === "warning" && "text-[color:var(--warning)]",
                  )}
                >
                  {metric.delta} nesta janela
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="glass rounded-[2rem] border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">{page.chart.title}</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{page.chart.description}</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium">
              Detalhar série
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={page.chart.data}>
                <defs>
                  <linearGradient id="flowArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#1875f2" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#1875f2" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(120, 140, 170, 0.16)" />
                <XAxis tickLine={false} axisLine={false} dataKey="label" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#1875f2" fill="url(#flowArea)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-[2rem] border p-6">
          <h3 className="font-display text-xl font-semibold">Leituras rápidas</h3>
          <div className="mt-5 space-y-3">
            {page.insights.map((insight) => (
              <article key={insight.label} className="rounded-3xl border bg-white/70 p-4 dark:bg-white/6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{insight.label}</p>
                <p className="mt-2 text-sm leading-6">{insight.value}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="glass rounded-[2rem] border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">Tabela operacional</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                Filtros rápidos, busca local e dados mockados prontos para conexão com a API.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar item..."
              className="rounded-2xl border bg-white/70 px-4 py-2.5 text-sm dark:bg-white/6"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {page.filterTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setFilter(tag)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  filter === tag ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]" : "bg-white/70 dark:bg-white/6",
                )}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[color:var(--muted-foreground)]">
                  {page.table.columns.map((column) => (
                    <th key={column} className="pb-4 pr-4 font-medium capitalize">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={`${row.nome}-${index}`} className="border-t">
                    {page.table.columns.map((column) => (
                      <td key={column} className="py-4 pr-4">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-[2rem] border p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">Novo item validado</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                Exemplo com React Hook Form e Zod para acelerar integrações reais depois.
              </p>
            </div>
          </div>

          <form
            onSubmit={form.handleSubmit((values) => {
              toast.success(`Solicitação "${values.title}" criada para ${values.owner}.`);
              form.reset({
                title: "",
                owner: values.owner,
                dueDate: values.dueDate,
                priority: values.priority,
              });
            })}
            className="mt-6 grid gap-4"
          >
            <div className="grid gap-2">
              <label className="text-sm font-medium">Título</label>
              <input
                {...form.register("title")}
                className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                placeholder={`Nova demanda em ${page.title}`}
              />
              <p className="text-xs text-[color:var(--danger)]">{form.formState.errors.title?.message}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Responsável</label>
                <input {...form.register("owner")} className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6" />
                <p className="text-xs text-[color:var(--danger)]">{form.formState.errors.owner?.message}</p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Prazo</label>
                <input
                  type="date"
                  {...form.register("dueDate")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                />
                <p className="text-xs text-[color:var(--danger)]">{form.formState.errors.dueDate?.message}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Prioridade</label>
              <select {...form.register("priority")} className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6">
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)]"
            >
              Criar solicitação
            </button>
          </form>
        </div>
      </div>

      <div className="glass rounded-[2rem] border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold">Kanban com drag and drop</h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Movimente cards entre colunas para simular a operação de squads e filas do produto.
            </p>
          </div>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="mt-6 grid gap-4 xl:grid-cols-4">
            {board.map((column) => (
              <div key={column.id} id={column.id} className="rounded-[1.75rem] border bg-white/60 p-4 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold">{column.title}</h4>
                  <span className="rounded-full bg-[color:var(--secondary)] px-2.5 py-1 text-xs text-[color:var(--secondary-foreground)]">
                    {column.tasks.length}
                  </span>
                </div>

                <SortableContext items={column.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                  <div className="mt-4 space-y-3">
                    {column.tasks.map((task) => (
                      <SortableTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            ))}
          </div>
        </DndContext>
      </div>

      <div className="glass rounded-[2rem] border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold">Calendário operacional</h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Visualização acessível de eventos, entregas e rituais com adaptação para telas menores.
            </p>
          </div>
          <p className="rounded-full bg-[color:var(--secondary)] px-3 py-1.5 text-sm text-[color:var(--secondary-foreground)]">
            Julho 2026
          </p>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
          {monthDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const events = page.calendar.filter((event) => event.date === dayKey);
            const inMonth = format(day, "MM") === "07";

            return (
              <div
                key={dayKey}
                className={cn(
                  "min-h-[148px] rounded-3xl border p-3",
                  inMonth ? "bg-white/70 dark:bg-white/6" : "bg-white/30 opacity-60 dark:bg-white/4",
                )}
              >
                <p className="text-sm font-semibold">{format(day, "d")}</p>
                <div className="mt-3 space-y-2">
                  {events.map((event) => (
                    <article key={event.id} className="rounded-2xl bg-[color:var(--accent)] px-3 py-2 text-left dark:bg-[color:var(--accent)]/80">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-foreground)]">
                        {event.channel}
                      </p>
                      <p className="mt-1 text-sm leading-5">{event.title}</p>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Acessibilidade", "Contraste, foco visível, semântica e interação por teclado já contemplados na base do layout."],
          ["Responsividade", "Sidebar recolhível, cards fluidos, tabela com overflow e calendário adaptado para mobile."],
          ["Preparado para API", `Mocks alinhados para evoluir ${page.title} com dados reais e estados assíncronos.`],
        ].map(([title, description]) => (
          <div key={title} className="glass rounded-[2rem] border p-5">
            <p className="font-semibold">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getCurrentUser(userId: string | null) {
  return (mockUsers.find((user) => user.id === userId) ?? mockUsers[0]) as AppUser;
}

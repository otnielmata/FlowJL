import type { AppUser, NavItem, NotificationItem, PageConfig, RoleKey } from "@/types/flow";
import { formatCurrency } from "@/lib/utils";

const fullRoles: RoleKey[] = ["admin", "strategist", "social-media", "traffic-manager", "operations", "approver"];

function createPage(
  key: string,
  title: string,
  path: string,
  description: string,
  icon: string,
  accent: string,
  metricSeed: number,
  allowedRoles: RoleKey[] = fullRoles,
): PageConfig {
  const chartBase = [32, 47, 53, 49, 65, 74];
  const statuses = ["Backlog", "Em andamento", "Em revisão"];

  return {
    key,
    title,
    path,
    description,
    icon,
    accent,
    allowedRoles,
    metrics: [
      {
        label: "Itens ativos",
        value: `${metricSeed + 18}`,
        delta: "+12%",
        tone: "primary",
      },
      {
        label: "Entregas no prazo",
        value: `${85 + (metricSeed % 8)}%`,
        delta: "+4,2%",
        tone: "success",
      },
      {
        label: "Investimento monitorado",
        value: formatCurrency((metricSeed + 4) * 6500),
        delta: "-3,1%",
        tone: "warning",
      },
    ],
    chart: {
      title: `Ritmo operacional de ${title}`,
      description: "Leitura semanal da evolução das entregas e marcos mais relevantes do módulo.",
      data: chartBase.map((value, index) => ({
        label: `S${index + 1}`,
        value: value + metricSeed,
      })),
    },
    table: {
      columns: ["nome", "responsável", "status", "prazo"],
      rows: Array.from({ length: 5 }).map((_, index) => ({
        nome: `${title} ${index + 1}`,
        responsável: ["Ana", "Bruno", "Camila", "Diego", "Erika"][index],
        status: statuses[index % statuses.length] ?? "Backlog",
        prazo: ["13 Jul", "15 Jul", "18 Jul", "22 Jul", "25 Jul"][index] ?? "13 Jul",
      })),
    },
    board: [
      {
        id: `${key}-backlog`,
        title: "Backlog",
        tasks: [
          {
            id: `${key}-task-1`,
            title: `Revisar prioridade de ${title.toLowerCase()}`,
            owner: "Ana",
            dueDate: "15 Jul",
            tag: "Planejamento",
          },
        ],
      },
      {
        id: `${key}-progress`,
        title: "Em andamento",
        tasks: [
          {
            id: `${key}-task-2`,
            title: `Executar frente principal de ${title.toLowerCase()}`,
            owner: "Bruno",
            dueDate: "18 Jul",
            tag: "Squad",
          },
        ],
      },
      {
        id: `${key}-review`,
        title: "Revisão",
        tasks: [
          {
            id: `${key}-task-3`,
            title: `Validar entrega crítica de ${title.toLowerCase()}`,
            owner: "Camila",
            dueDate: "21 Jul",
            tag: "Qualidade",
          },
        ],
      },
      {
        id: `${key}-done`,
        title: "Concluído",
        tasks: [
          {
            id: `${key}-task-4`,
            title: `Aprovar checklist base de ${title.toLowerCase()}`,
            owner: "Diego",
            dueDate: "11 Jul",
            tag: "Governança",
          },
        ],
      },
    ],
    calendar: [
      {
        id: `${key}-event-1`,
        title: `${title} | Daily de alinhamento`,
        date: "2026-07-14",
        channel: "Agenda",
      },
      {
        id: `${key}-event-2`,
        title: `${title} | Marco da sprint`,
        date: "2026-07-17",
        channel: "Sprint",
      },
      {
        id: `${key}-event-3`,
        title: `${title} | Revisão executiva`,
        date: "2026-07-22",
        channel: "Diretoria",
      },
    ],
    actions: [
      {
        title: "Criar item rapidamente",
        description: "Dispare novas demandas com responsáveis, prazo e contexto mínimo validado.",
      },
      {
        title: "Atualizar status crítico",
        description: "Use filtros salvos para localizar gargalos e agir antes de perder a janela do lançamento.",
      },
    ],
    insights: [
      {
        label: "Principal gargalo",
        value: "Dependência cruzada entre conteúdo, aprovação e mídia.",
      },
      {
        label: "Próxima decisão",
        value: "Repriorizar o fluxo com base nos itens mais próximos do prazo.",
      },
      {
        label: "Recomendação",
        value: "Acionar IA e automações para reduzir retrabalho operacional.",
      },
    ],
    filterTags: ["Todos", "Backlog", "Em andamento", "Em revisão"],
  };
}

export const mockUsers: AppUser[] = [
  {
    id: "u-admin",
    name: "Júlia Lima",
    email: "julia@flowjl.com",
    password: "flowjl123",
    role: "admin",
    roleLabel: "Administrador",
    focus: "Visão global",
  },
  {
    id: "u-strategy",
    name: "Renato Alves",
    email: "renato@flowjl.com",
    password: "flowjl123",
    role: "strategist",
    roleLabel: "Estratégia Digital",
    focus: "Planejamento",
  },
  {
    id: "u-social",
    name: "Clara Borges",
    email: "clara@flowjl.com",
    password: "flowjl123",
    role: "social-media",
    roleLabel: "Social Media",
    focus: "Editorial",
  },
  {
    id: "u-traffic",
    name: "Lucas Freitas",
    email: "lucas@flowjl.com",
    password: "flowjl123",
    role: "traffic-manager",
    roleLabel: "Tráfego Pago",
    focus: "Performance",
  },
  {
    id: "u-ops",
    name: "Marina Costa",
    email: "marina@flowjl.com",
    password: "flowjl123",
    role: "operations",
    roleLabel: "Operações",
    focus: "Orquestração",
  },
  {
    id: "u-approver",
    name: "Paulo Nunes",
    email: "paulo@flowjl.com",
    password: "flowjl123",
    role: "approver",
    roleLabel: "Aprovações",
    focus: "Governança",
  },
];

export function findMockUserByEmail(email: string) {
  return mockUsers.find((user) => user.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", group: "Visão" },
  { label: "Estratégia Digital", href: "/estrategias", icon: "Compass", group: "Planejamento" },
  { label: "Lançamentos", href: "/lancamentos", icon: "Rocket", group: "Planejamento" },
  { label: "Cronogramas", href: "/cronogramas", icon: "CalendarRange", group: "Planejamento" },
  { label: "Produção de Conteúdo", href: "/conteudos", icon: "Clapperboard", group: "Execução" },
  { label: "Social Media", href: "/social-media", icon: "Megaphone", group: "Execução" },
  { label: "Tráfego Pago", href: "/trafego", icon: "Radar", group: "Performance" },
  { label: "Operações", href: "/operacoes", icon: "Workflow", group: "Execução" },
  { label: "Aprovações", href: "/aprovacoes", icon: "BadgeCheck", group: "Governança" },
  { label: "Inteligência Artificial", href: "/ia", icon: "Sparkles", group: "Automação" },
  { label: "Relatórios", href: "/relatorios", icon: "BarChart3", group: "Inteligência" },
  { label: "Usuários", href: "/usuarios", icon: "Users2", group: "Administração" },
  { label: "Perfis", href: "/perfis", icon: "ShieldCheck", group: "Administração" },
  { label: "Cargos", href: "/cargos", icon: "BriefcaseBusiness", group: "Administração" },
  { label: "Configurações", href: "/configuracoes", icon: "Settings2", group: "Administração" },
];

export const notifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Aprovação prioritária pendente",
    description: "Dois criativos aguardam aprovação para a janela de mídia de amanhã.",
    time: "há 12 min",
    tone: "warning",
  },
  {
    id: "n2",
    title: "IA gerou nova sequência editorial",
    description: "O material base do lançamento Flow JL Summer já está disponível para revisão humana.",
    time: "há 35 min",
    tone: "info",
  },
  {
    id: "n3",
    title: "Cronograma operacional atualizado",
    description: "Checklist de operações foi reajustado com novas datas e dependências críticas.",
    time: "há 1 h",
    tone: "success",
  },
];

export const pageConfigs: PageConfig[] = [
  createPage(
    "dashboard",
    "Dashboard",
    "/dashboard",
    "Painel executivo com visão integrada de performance, risco operacional e próximos marcos do lançamento.",
    "LayoutDashboard",
    "from-[#1875f2]/18 via-[#1875f2]/6 to-transparent",
    14,
  ),
  createPage(
    "strategies",
    "Estratégia Digital",
    "/estrategias",
    "Organize posicionamento, promessas, linhas editoriais e hipóteses de campanha por lançamento.",
    "Compass",
    "from-[#25b58f]/18 via-[#25b58f]/6 to-transparent",
    11,
    ["admin", "strategist", "operations"],
  ),
  createPage(
    "launches",
    "Lançamentos",
    "/lancamentos",
    "Acompanhe ondas de lançamento, squads responsáveis, fases e marcos críticos da operação.",
    "Rocket",
    "from-[#ff9f43]/16 via-[#ff9f43]/5 to-transparent",
    19,
  ),
  createPage(
    "schedules",
    "Cronogramas",
    "/cronogramas",
    "Consolide calendários, dependências e checkpoints por squad com visão por semana e por marco.",
    "CalendarRange",
    "from-[#6f7dff]/18 via-[#6f7dff]/6 to-transparent",
    12,
  ),
  createPage(
    "content",
    "Produção de Conteúdo",
    "/conteudos",
    "Gerencie pauta, produção, revisão, roteiros e peças derivadas com acompanhamento validado.",
    "Clapperboard",
    "from-[#f45b8d]/18 via-[#f45b8d]/6 to-transparent",
    21,
    ["admin", "strategist", "social-media", "operations", "approver"],
  ),
  createPage(
    "social",
    "Social Media",
    "/social-media",
    "Planeje calendário editorial, distribuição de canais e publicações com visão operacional.",
    "Megaphone",
    "from-[#ff7b54]/18 via-[#ff7b54]/6 to-transparent",
    16,
    ["admin", "strategist", "social-media", "operations"],
  ),
  createPage(
    "traffic",
    "Tráfego Pago",
    "/trafego",
    "Monitore campanhas, verbas, criativos e públicos com clareza de performance e risco.",
    "Radar",
    "from-[#34c6eb]/18 via-[#34c6eb]/6 to-transparent",
    17,
    ["admin", "traffic-manager", "strategist"],
  ),
  createPage(
    "operations",
    "Operações",
    "/operacoes",
    "Coordene checklists, dependências, SLAs e execução entre times para reduzir gargalos.",
    "Workflow",
    "from-[#7dd35f]/18 via-[#7dd35f]/6 to-transparent",
    20,
    ["admin", "operations", "approver"],
  ),
  createPage(
    "approvals",
    "Aprovações",
    "/aprovacoes",
    "Concentre a fila de aprovação com prioridade, histórico e urgências por ativo.",
    "BadgeCheck",
    "from-[#f6c34a]/18 via-[#f6c34a]/6 to-transparent",
    9,
    ["admin", "approver", "strategist", "social-media"],
  ),
  createPage(
    "ai",
    "Inteligência Artificial",
    "/ia",
    "Use assistentes operacionais para acelerar copies, cronogramas, checklists e variações de conteúdo.",
    "Sparkles",
    "from-[#8f7cff]/18 via-[#8f7cff]/6 to-transparent",
    23,
  ),
  createPage(
    "reports",
    "Relatórios",
    "/relatorios",
    "Monte leituras de negócio com indicadores, filtros e snapshots compartilháveis por lançamento.",
    "BarChart3",
    "from-[#5fbbe5]/18 via-[#5fbbe5]/6 to-transparent",
    13,
  ),
  createPage(
    "users",
    "Usuários",
    "/usuarios",
    "Controle administrativo de acessos ao portal, convites, status de conta e acompanhamento de atividade.",
    "Users2",
    "from-[#8b5cf6]/18 via-[#14b8a6]/10 to-transparent",
    10,
    ["admin"],
  ),
  createPage(
    "profiles",
    "Perfis",
    "/perfis",
    "Gestão de perfis de acesso, níveis de permissão e regras de governança para o portal web.",
    "ShieldCheck",
    "from-[#84cc16]/16 via-[#8b5cf6]/8 to-transparent",
    8,
    ["admin"],
  ),
  createPage(
    "roles",
    "Cargos",
    "/cargos",
    "Estruture cargos administrativos, responsabilidades e trilhas de aprovacao do portal web.",
    "BriefcaseBusiness",
    "from-[#38bdf8]/16 via-[#8b5cf6]/10 to-transparent",
    6,
    ["admin"],
  ),
  createPage(
    "settings",
    "Configurações",
    "/configuracoes",
    "Administre preferências, integrações, perfis simulados e regras operacionais do ambiente.",
    "Settings2",
    "from-[#8798b7]/18 via-[#8798b7]/6 to-transparent",
    7,
    ["admin", "operations"],
  ),
];

export function getPageConfig(path: string) {
  const exactPage = pageConfigs.find((page) => page.path === path);

  if (exactPage) {
    return exactPage;
  }

  const [rootSegment] = path.split("/").filter(Boolean);

  return pageConfigs.find((page) => page.path === `/${rootSegment}`) ?? pageConfigs[0];
}

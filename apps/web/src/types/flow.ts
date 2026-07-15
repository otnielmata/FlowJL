export type RoleKey =
  | "admin"
  | "strategist"
  | "social-media"
  | "traffic-manager"
  | "operations"
  | "approver";

export type ExperienceState = "ready" | "loading" | "error" | "empty";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: RoleKey;
  roleLabel: string;
  focus: string;
};

export type ManagedUser = AppUser & {
  profileName: string;
  jobTitle: string;
  squad: string;
  status: "Ativo" | "Pendente" | "Suspenso";
  lastAccess: string;
};

export type ProfilePermission = "Total" | "Edicao" | "Leitura";

export type AccessProfile = {
  id: string;
  name: string;
  focus: string;
  approvals: string;
  role: RoleKey;
  roleLabel: string;
  modules: Array<{
    name: string;
    permission: ProfilePermission;
  }>;
};

export type JobRole = {
  id: string;
  name: string;
  scope: string;
  reportsTo: string;
  headcount: number;
  responsibilities: string[];
};

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  group: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  tone: "info" | "warning" | "success";
};

export type Metric = {
  label: string;
  value: string;
  delta: string;
  tone: "primary" | "success" | "warning";
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type DataTable = {
  columns: string[];
  rows: Record<string, string>[];
};

export type BoardTask = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  tag: string;
};

export type BoardColumn = {
  id: string;
  title: string;
  tasks: BoardTask[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  channel: string;
};

export type ActionCard = {
  title: string;
  description: string;
};

export type Insight = {
  label: string;
  value: string;
};

export type PageConfig = {
  key: string;
  title: string;
  path: string;
  description: string;
  icon: string;
  accent: string;
  allowedRoles: RoleKey[];
  metrics: Metric[];
  chart: {
    title: string;
    description: string;
    data: ChartPoint[];
  };
  table: DataTable;
  board: BoardColumn[];
  calendar: CalendarEvent[];
  actions: ActionCard[];
  insights: Insight[];
  filterTags: string[];
};

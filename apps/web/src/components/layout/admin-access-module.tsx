"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, BadgeCheck, BriefcaseBusiness, KeyRound, ShieldCheck, UserPlus2, Users2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { mockUsers } from "@/mocks/flow-data";
import type { PageConfig } from "@/types/flow";

const inviteUserSchema = z.object({
  name: z.string().min(3, "Informe um nome com pelo menos 3 caracteres."),
  email: z.email("Informe um email valido."),
  role: z.string().min(1, "Selecione um perfil de acesso."),
});

const createProfileSchema = z.object({
  name: z.string().min(3, "Defina um nome claro para o perfil."),
  scope: z.string().min(1, "Selecione o escopo principal."),
  approvalLimit: z.string().min(1, "Informe o limite de aprovacao."),
});

type InviteUserForm = z.infer<typeof inviteUserSchema>;
type CreateProfileForm = z.infer<typeof createProfileSchema>;

type PortalUser = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  squad: string;
  status: "Ativo" | "Pendente" | "Suspenso";
  lastAccess: string;
};

type AccessProfile = {
  id: string;
  name: string;
  focus: string;
  approvals: string;
  members: number;
  modules: Array<{
    name: string;
    permission: "Total" | "Edicao" | "Leitura";
  }>;
};

type RoleCatalog = {
  id: string;
  name: string;
  scope: string;
  reportsTo: string;
  headcount: number;
  responsibilities: string[];
};

const portalUsers: PortalUser[] = [
  {
    id: "user-1",
    name: "Júlia Lima",
    email: "julia@flowjl.com",
    roleLabel: "Administrador",
    squad: "Diretoria",
    status: "Ativo",
    lastAccess: "Hoje, 09:14",
  },
  {
    id: "user-2",
    name: "Marina Costa",
    email: "marina@flowjl.com",
    roleLabel: "Operações",
    squad: "Ops Core",
    status: "Ativo",
    lastAccess: "Hoje, 08:42",
  },
  {
    id: "user-3",
    name: "Lucas Freitas",
    email: "lucas@flowjl.com",
    roleLabel: "Tráfego Pago",
    squad: "Growth",
    status: "Pendente",
    lastAccess: "Convite enviado",
  },
  {
    id: "user-4",
    name: "Paulo Nunes",
    email: "paulo@flowjl.com",
    roleLabel: "Aprovações",
    squad: "Governança",
    status: "Ativo",
    lastAccess: "Ontem, 18:11",
  },
  {
    id: "user-5",
    name: "Clara Borges",
    email: "clara@flowjl.com",
    roleLabel: "Social Media",
    squad: "Conteúdo",
    status: "Suspenso",
    lastAccess: "07 Jul, 16:03",
  },
];

const accessProfiles: AccessProfile[] = [
  {
    id: "profile-admin",
    name: "Administrador Flow JL",
    focus: "Controle total da operação e da segurança",
    approvals: "Sem limite",
    members: 2,
    modules: [
      { name: "Dashboard", permission: "Total" },
      { name: "Operações", permission: "Total" },
      { name: "Usuários", permission: "Total" },
      { name: "Perfis", permission: "Total" },
      { name: "Configurações", permission: "Total" },
    ],
  },
  {
    id: "profile-ops",
    name: "Coordenador Operacional",
    focus: "Execução, filas críticas e dependências",
    approvals: "Até R$ 25 mil",
    members: 4,
    modules: [
      { name: "Dashboard", permission: "Leitura" },
      { name: "Cronogramas", permission: "Edicao" },
      { name: "Operações", permission: "Total" },
      { name: "Aprovações", permission: "Edicao" },
      { name: "Relatórios", permission: "Leitura" },
    ],
  },
  {
    id: "profile-approval",
    name: "Aprovador Executivo",
    focus: "Governança de verba, criativos e marcos",
    approvals: "Até R$ 80 mil",
    members: 3,
    modules: [
      { name: "Dashboard", permission: "Leitura" },
      { name: "Aprovações", permission: "Total" },
      { name: "Relatórios", permission: "Leitura" },
      { name: "Operações", permission: "Leitura" },
      { name: "Cronogramas", permission: "Leitura" },
    ],
  },
];

const roleCatalog: RoleCatalog[] = [
  {
    id: "cargo-1",
    name: "Administrador do Portal",
    scope: "Gestão total de acesso e governança",
    reportsTo: "Diretoria JL",
    headcount: 2,
    responsibilities: [
      "Gerenciar usuarios, perfis e cargos",
      "Liberar acessos criticos do portal",
      "Auditar mudancas sensiveis de permissao",
    ],
  },
  {
    id: "cargo-2",
    name: "Coordenador Operacional",
    scope: "Execução e dependências entre squads",
    reportsTo: "Administrador do Portal",
    headcount: 4,
    responsibilities: [
      "Acompanhar cronogramas e filas operacionais",
      "Atualizar status criticos do lancamento",
      "Escalar bloqueios de producao e aprovacao",
    ],
  },
  {
    id: "cargo-3",
    name: "Especialista de Performance",
    scope: "Midia, investimento e indicadores",
    reportsTo: "Coordenador Operacional",
    headcount: 3,
    responsibilities: [
      "Operar campanhas e verbas",
      "Revisar indicadores de performance",
      "Sinalizar riscos de meta e janela de lancamento",
    ],
  },
];

const roleOptions = mockUsers.map((user) => user.roleLabel);
const scopeOptions = ["Operação completa", "Governança", "Performance", "Conteúdo", "Leitura executiva"];

export function AdminAccessModule({ page, path }: { page: PageConfig; path: string }) {
  if (path === "/usuarios") {
    return <UsersAdminModule page={page} />;
  }

  if (path === "/cargos") {
    return <RolesAdminModule page={page} />;
  }

  return <ProfilesAdminModule page={page} />;
}

function UsersAdminModule({ page }: { page: PageConfig }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PortalUser["status"] | "Todos">("Todos");
  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: roleOptions[0] ?? "Administrador",
    },
  });

  const filteredUsers = useMemo(() => {
    return portalUsers.filter((user) => {
      const matchesStatus = statusFilter === "Todos" || user.status === statusFilter;
      const term = search.toLowerCase();
      const matchesSearch =
        term === "" ||
        [user.name, user.email, user.roleLabel, user.squad].some((value) => value.toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter]);

  return (
    <section className="page-grid">
      <AdminHero
        page={page}
        icon={<Users2 className="h-5 w-5" />}
        eyebrow="Acesso administrativo"
        title="Controle de usuários do portal"
        description="Gerencie convites, acompanhe acessos recentes, suspenda perfis e mantenha a governança do portal Flow JL centralizada no administrador."
        highlights={[
          "Entrada principal pelo login com perfis simulados",
          "Monitoramento de status ativo, pendente e suspenso",
          "Pronto para evoluir com API real de identidade",
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-[2rem] border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">Base de acessos</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                Visualize quem tem acesso ao portal, em qual squad atua e o ultimo movimento registrado.
              </p>
            </div>
            <div className="rounded-2xl bg-[color:var(--secondary)] px-4 py-2 text-sm font-medium text-[color:var(--secondary-foreground)]">
              {filteredUsers.length} usuarios visiveis
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, email ou squad"
              className="min-w-[260px] flex-1 rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
            />
            {["Todos", "Ativo", "Pendente", "Suspenso"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status as PortalUser["status"] | "Todos")}
                className={cn(
                  "rounded-full border px-3 py-2 text-sm",
                  statusFilter === status ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]" : "bg-white/70 dark:bg-white/6",
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[color:var(--muted-foreground)]">
                  {["usuario", "perfil", "squad", "status", "ultimo acesso"].map((column) => (
                    <th key={column} className="pb-4 pr-4 font-medium capitalize">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="py-4 pr-4">
                      <p className="font-medium">{user.name}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{user.email}</p>
                    </td>
                    <td className="py-4 pr-4">{user.roleLabel}</td>
                    <td className="py-4 pr-4">{user.squad}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          user.status === "Ativo" && "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
                          user.status === "Pendente" && "bg-amber-500/14 text-amber-700 dark:text-amber-300",
                          user.status === "Suspenso" && "bg-rose-500/14 text-rose-700 dark:text-rose-300",
                        )}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4">{user.lastAccess}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="glass rounded-[2rem] border p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--primary)]/12 p-3 text-[color:var(--primary)]">
                <UserPlus2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">Convidar novo usuario</h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">Fluxo validado para onboarding administrativo.</p>
              </div>
            </div>

            <form
              onSubmit={form.handleSubmit((values) => {
                toast.success(`Convite enviado para ${values.name}.`);
                form.reset({
                  name: "",
                  email: "",
                  role: values.role,
                });
              })}
              className="mt-6 grid gap-4"
            >
              <Field label="Nome" error={form.formState.errors.name?.message}>
                <input
                  {...form.register("name")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Nome do novo usuario"
                />
              </Field>
              <Field label="Email" error={form.formState.errors.email?.message}>
                <input
                  type="email"
                  {...form.register("email")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="email@flowjl.com"
                />
              </Field>
              <Field label="Perfil de acesso" error={form.formState.errors.role?.message}>
                <select {...form.register("role")} className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6">
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </Field>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)]"
              >
                Enviar convite
              </button>
            </form>
          </div>

          <InfoPanel
            title="Alertas de seguranca"
            items={[
              "1 usuario suspenso aguardando revisao do administrador.",
              "2 convites ainda nao aceitos dentro da janela da sprint.",
              "Ultimo ajuste de acesso critico realizado hoje as 09:14.",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function ProfilesAdminModule({ page }: { page: PageConfig }) {
  const [selectedProfileId, setSelectedProfileId] = useState(accessProfiles[0]?.id ?? "");
  const selectedProfile = accessProfiles.find((profile) => profile.id === selectedProfileId) ?? accessProfiles[0];
  const form = useForm<CreateProfileForm>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      name: "",
      scope: scopeOptions[0] ?? "Operação completa",
      approvalLimit: "R$ 15 mil",
    },
  });

  return (
    <section className="page-grid">
      <AdminHero
        page={page}
        icon={<ShieldCheck className="h-5 w-5" />}
        eyebrow="Acesso administrativo"
        title="Perfis e permissoes do portal"
        description="Defina o que cada papel pode visualizar, editar ou aprovar dentro da operacao Flow JL, com uma leitura pronta para evolucao com RBAC real."
        highlights={[
          "Perfis separados por foco operacional e governanca",
          "Matriz de modulos com niveis de permissao claros",
          "Base pronta para politicas futuras por squad e aprovacao",
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-5">
          <div className="glass rounded-[2rem] border p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--primary)]/12 p-3 text-[color:var(--primary)]">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">Perfis ativos</h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">Selecione um perfil para revisar sua cobertura.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {accessProfiles.map((profile) => {
                const active = profile.id === selectedProfileId;

                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={cn(
                      "w-full rounded-3xl border p-4 text-left transition",
                      active
                        ? "border-[color:var(--primary)] bg-[color:var(--primary)]/8 shadow-sm"
                        : "bg-white/70 hover:border-[color:var(--primary)]/30 dark:bg-white/6",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{profile.name}</p>
                        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{profile.focus}</p>
                      </div>
                      <span className="rounded-full bg-[color:var(--secondary)] px-3 py-1 text-xs font-medium text-[color:var(--secondary-foreground)]">
                        {profile.members} membros
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-[2rem] border p-6">
            <h3 className="font-display text-xl font-semibold">Criar novo perfil</h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Modelo validado para o administrador cadastrar novos perfis de acesso.
            </p>

            <form
              onSubmit={form.handleSubmit((values) => {
                toast.success(`Perfil ${values.name} preparado para configuracao.`);
                form.reset({
                  name: "",
                  scope: values.scope,
                  approvalLimit: values.approvalLimit,
                });
              })}
              className="mt-6 grid gap-4"
            >
              <Field label="Nome do perfil" error={form.formState.errors.name?.message}>
                <input
                  {...form.register("name")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Ex: Lider de Growth"
                />
              </Field>
              <Field label="Escopo principal" error={form.formState.errors.scope?.message}>
                <select {...form.register("scope")} className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6">
                  {scopeOptions.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Limite de aprovacao" error={form.formState.errors.approvalLimit?.message}>
                <input
                  {...form.register("approvalLimit")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="R$ 15 mil"
                />
              </Field>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)]"
              >
                Salvar perfil base
              </button>
            </form>
          </div>
        </div>

        <div className="glass rounded-[2rem] border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">{selectedProfile.name}</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{selectedProfile.focus}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--secondary)] px-4 py-2 text-sm font-medium text-[color:var(--secondary-foreground)]">
              {selectedProfile.approvals}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Membros vinculados", `${selectedProfile.members}`],
              ["Modulos liberados", `${selectedProfile.modules.length}`],
              ["Tipo de controle", "RBAC simulado"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border bg-white/70 p-4 dark:bg-white/6">
                <p className="text-sm text-[color:var(--muted-foreground)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[color:var(--muted-foreground)]">
                  <th className="pb-4 pr-4 font-medium">Modulo</th>
                  <th className="pb-4 pr-4 font-medium">Permissao</th>
                  <th className="pb-4 pr-4 font-medium">Leitura administrativa</th>
                </tr>
              </thead>
              <tbody>
                {selectedProfile.modules.map((module) => (
                  <tr key={module.name} className="border-t">
                    <td className="py-4 pr-4 font-medium">{module.name}</td>
                    <td className="py-4 pr-4">
                      <span className="rounded-full bg-[color:var(--secondary)] px-3 py-1 text-xs font-semibold text-[color:var(--secondary-foreground)]">
                        {module.permission}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-[color:var(--muted-foreground)]">
                      {module.permission === "Total" && "Pode configurar, editar e aprovar"}
                      {module.permission === "Edicao" && "Pode operar sem alterar regras maes"}
                      {module.permission === "Leitura" && "Acesso consultivo para acompanhamento"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoPanel
              title="Regras de negocio sugeridas"
              items={[
                "Somente administrador cria ou remove perfis.",
                "Perfis com aprovacao financeira exigem trilha de auditoria.",
                "Permissoes criticas devem respeitar escopo por modulo e squad.",
              ]}
            />
            <InfoPanel
              title="Checklist de governanca"
              items={[
                "Revisar perfis ociosos a cada sprint.",
                "Cruzar usuarios suspensos com acessos recentes.",
                "Versionar alteracoes sensiveis de permissao antes do deploy da API.",
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function RolesAdminModule({ page }: { page: PageConfig }) {
  const [selectedRoleId, setSelectedRoleId] = useState(roleCatalog[0]?.id ?? "");
  const selectedRole = roleCatalog.find((role) => role.id === selectedRoleId) ?? roleCatalog[0];

  return (
    <section className="page-grid">
      <AdminHero
        page={page}
        icon={<BriefcaseBusiness className="h-5 w-5" />}
        eyebrow="Acesso administrativo"
        title="Cargos e estrutura de responsabilidade"
        description="Organize os cargos do portal web e mantenha a separacao de responsabilidade sob controle total do administrador."
        highlights={[
          "Somente administrador pode cadastrar ou editar cargos",
          "Cargos orientam perfis, aprovacoes e responsabilidade operacional",
          "Estrutura pronta para evoluir com hierarquia real na API",
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="glass rounded-[2rem] border p-6">
          <h3 className="font-display text-xl font-semibold">Catalogo de cargos</h3>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Area visivel apenas para o administrador do portal.
          </p>

          <div className="mt-6 space-y-3">
            {roleCatalog.map((role) => {
              const active = role.id === selectedRoleId;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={cn(
                    "w-full rounded-3xl border p-4 text-left transition",
                    active
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)]/8 shadow-sm"
                      : "bg-white/70 hover:border-[color:var(--primary)]/30 dark:bg-white/6",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{role.name}</p>
                      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{role.scope}</p>
                    </div>
                    <span className="rounded-full bg-[color:var(--secondary)] px-3 py-1 text-xs font-medium text-[color:var(--secondary-foreground)]">
                      {role.headcount} vagas
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-[2rem] border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">{selectedRole.name}</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{selectedRole.scope}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--secondary)] px-4 py-2 text-sm font-medium text-[color:var(--secondary-foreground)]">
              Reporta para {selectedRole.reportsTo}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Responsavel por", selectedRole.scope],
              ["Quantidade atual", `${selectedRole.headcount}`],
              ["Acesso ao cadastro", "Administrador"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border bg-white/70 p-4 dark:bg-white/6">
                <p className="text-sm text-[color:var(--muted-foreground)]">{label}</p>
                <p className="mt-2 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3">
            {selectedRole.responsibilities.map((item) => (
              <div key={item} className="rounded-2xl border bg-white/70 px-4 py-3 text-sm leading-6 dark:bg-white/6">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoPanel
              title="Regras de acesso"
              items={[
                "Nao administradores nao visualizam o modulo na navegacao.",
                "Acesso direto por URL continua bloqueado por permissao.",
                "Mudancas de cargo devem refletir em perfis e trilhas de aprovacao.",
              ]}
            />
            <InfoPanel
              title="Governanca de cargos"
              items={[
                "Revisar cargos sem ocupacao a cada ciclo administrativo.",
                "Manter consistencia entre cargo, perfil e modulo liberado.",
                "Registrar historico antes de publicar a API real de identidade.",
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminHero({
  page,
  icon,
  eyebrow,
  title,
  description,
  highlights,
}: {
  page: PageConfig;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
}) {
  return (
    <div className={cn("glass overflow-hidden rounded-[2rem] border", `bg-gradient-to-br ${page.accent}`)}>
      <div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/60 px-3 py-1.5 text-sm text-[color:var(--accent-foreground)] dark:bg-white/8">
            {icon}
            {eyebrow}
          </div>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)] sm:text-base">{description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {highlights.map((item) => (
            <div key={item} className="glass rounded-[1.75rem] border p-5">
              <p className="flex items-start gap-3 text-sm leading-6">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--primary)]" />
                <span>{item}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      <p className="text-xs text-[color:var(--danger)]">{error}</p>
    </div>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="glass rounded-[2rem] border p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[color:var(--primary)]/12 p-2 text-[color:var(--primary)]">
          <AlertCircle className="h-4 w-4" />
        </div>
        <h4 className="font-display text-lg font-semibold">{title}</h4>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border bg-white/70 px-4 py-3 text-sm leading-6 dark:bg-white/6">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

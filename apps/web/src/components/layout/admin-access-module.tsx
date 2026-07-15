"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, BadgeCheck, BriefcaseBusiness, KeyRound, ShieldCheck, UserPlus2, Users2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { initialJobRoles, useJobRoleDirectoryStore } from "@/stores/job-role-directory-store";
import { initialAccessProfiles, useProfileDirectoryStore } from "@/stores/profile-directory-store";
import { useUserDirectoryStore } from "@/stores/user-directory-store";
import type { AccessProfile, JobRole, ManagedUser, PageConfig, ProfilePermission, RoleKey } from "@/types/flow";

const passwordRule = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .regex(/[a-z]/, "Inclua pelo menos uma letra minuscula.")
  .regex(/[A-Z]/, "Inclua pelo menos uma letra maiuscula.")
  .regex(/[0-9]/, "Inclua pelo menos um numero.");

const optionalPasswordRule = z
  .string()
  .refine((value) => value === "" || value.length >= 8, "A senha precisa ter pelo menos 8 caracteres.")
  .refine((value) => value === "" || /[a-z]/.test(value), "Inclua pelo menos uma letra minuscula.")
  .refine((value) => value === "" || /[A-Z]/.test(value), "Inclua pelo menos uma letra maiuscula.")
  .refine((value) => value === "" || /[0-9]/.test(value), "Inclua pelo menos um numero.");

const inviteUserSchema = z
  .object({
    name: z.string().min(3, "Informe um nome com pelo menos 3 caracteres."),
    email: z.email("Informe um email valido."),
    profileName: z.string().min(1, "Selecione um perfil de acesso."),
    jobTitle: z.string().min(1, "Selecione um cargo."),
    squad: z.string().min(2, "Informe a squad do usuario."),
    password: passwordRule,
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "As senhas informadas precisam ser iguais.",
    path: ["passwordConfirmation"],
  });

const editUserSchema = z
  .object({
    name: z.string().min(3, "Informe um nome com pelo menos 3 caracteres."),
    email: z.email("Informe um email valido."),
    profileName: z.string().min(1, "Selecione um perfil de acesso."),
    jobTitle: z.string().min(1, "Selecione um cargo."),
    squad: z.string().min(2, "Informe a squad do usuario."),
    status: z.enum(["Ativo", "Pendente", "Suspenso"]),
    password: optionalPasswordRule,
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "As senhas informadas precisam ser iguais.",
    path: ["passwordConfirmation"],
  });

const createProfileSchema = z.object({
  name: z.string().min(3, "Defina um nome claro para o perfil."),
  focus: z.string().min(5, "Descreva o escopo principal do perfil."),
  approvals: z.string().min(1, "Informe o limite de aprovacao."),
  role: z.enum(["admin", "strategist", "social-media", "traffic-manager", "operations", "approver"]),
});

const jobRoleSchema = z.object({
  name: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres."),
  scope: z.string().trim().min(5, "Descreva o escopo principal do cargo."),
  reportsTo: z.string().trim().min(2, "Informe a lideranca responsavel pelo cargo."),
  headcount: z.number().int("Informe um numero inteiro.").min(0, "A quantidade nao pode ser negativa.").max(999),
  responsibilities: z.string().trim().min(5, "Informe pelo menos uma responsabilidade."),
});

type InviteUserForm = z.infer<typeof inviteUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;
type CreateProfileForm = z.infer<typeof createProfileSchema>;
type JobRoleForm = z.infer<typeof jobRoleSchema>;
const profileRoleOptions: Array<{ value: RoleKey; label: string }> = [
  { value: "admin", label: "Administrador" },
  { value: "strategist", label: "Estratégia Digital" },
  { value: "social-media", label: "Social Media" },
  { value: "traffic-manager", label: "Tráfego Pago" },
  { value: "operations", label: "Operações" },
  { value: "approver", label: "Aprovações" },
];

const defaultProfileModules: AccessProfile["modules"] = [
  { name: "Dashboard", permission: "Leitura" },
  { name: "Cronogramas", permission: "Leitura" },
  { name: "Operações", permission: "Leitura" },
  { name: "Aprovações", permission: "Leitura" },
  { name: "Relatórios", permission: "Leitura" },
];

function getAccessRole(profileName: string, profiles: AccessProfile[]): { role: RoleKey; roleLabel: string } {
  const profile = profiles.find((entry) => entry.name === profileName);

  return profile
    ? { role: profile.role, roleLabel: profile.roleLabel }
    : { role: "operations", roleLabel: "Operações" };
}

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
  const users = useUserDirectoryStore((state) => state.users);
  const addUser = useUserDirectoryStore((state) => state.addUser);
  const updateUser = useUserDirectoryStore((state) => state.updateUser);
  const profiles = useProfileDirectoryStore((state) => state.profiles);
  const jobRoles = useJobRoleDirectoryStore((state) => state.roles);
  const profileOptions = profiles.map((profile) => profile.name);
  const jobTitleOptions = jobRoles.map((role) => role.name);
  const [selectedUserId, setSelectedUserId] = useState("u-admin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ManagedUser["status"] | "Todos">("Todos");

  const inviteForm = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      name: "",
      email: "",
      profileName: profileOptions[0] ?? "Administrador Flow JL",
      jobTitle: jobTitleOptions[0] ?? "Administrador do Portal",
      squad: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: "",
      email: "",
      profileName: profileOptions[0] ?? "Administrador Flow JL",
      jobTitle: jobTitleOptions[0] ?? "Administrador do Portal",
      squad: "",
      status: "Ativo",
      password: "",
      passwordConfirmation: "",
    },
  });

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0];

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesStatus = statusFilter === "Todos" || user.status === statusFilter;
      const term = search.toLowerCase();
      const matchesSearch =
        term === "" ||
        [user.name, user.email, user.profileName, user.jobTitle, user.squad].some((value) =>
          value.toLowerCase().includes(term),
        );

      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, users]);

  useEffect(() => {
    if (selectedUser) {
      editForm.reset({
        name: selectedUser.name,
        email: selectedUser.email,
        profileName: selectedUser.profileName,
        jobTitle: selectedUser.jobTitle,
        squad: selectedUser.squad,
        status: selectedUser.status,
        password: "",
        passwordConfirmation: "",
      });
    }
  }, [editForm, selectedUser, users]);

  return (
    <section className="page-grid">
      <AdminHero
        page={page}
        icon={<Users2 className="h-5 w-5" />}
        eyebrow="Acesso administrativo"
        title="Controle de usuários do portal"
        description="Gerencie credenciais, perfis, cargos e status de cada usuario com a governança do portal centralizada no administrador."
        highlights={[
          "Redefinicao controlada de senha pelo administrador",
          "Perfil e cargo vinculados individualmente",
          "Credenciais persistidas e usadas no proximo login",
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-[2rem] border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">Base de acessos</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Visualize, selecione e edite os cadastros do portal.</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--secondary)] px-4 py-2 text-sm font-medium text-[color:var(--secondary-foreground)]">
              {filteredUsers.length} usuarios visiveis
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, email, perfil, cargo ou squad"
              className="min-w-[260px] flex-1 rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
            />
            {["Todos", "Ativo", "Pendente", "Suspenso"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status as ManagedUser["status"] | "Todos")}
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
                  {["usuario", "perfil", "cargo", "squad", "status", "ultimo acesso"].map((column) => (
                    <th key={column} className="pb-4 pr-4 font-medium capitalize">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={cn("border-t transition", selectedUserId === user.id && "bg-[color:var(--primary)]/5")}
                  >
                    <td className="py-4 pr-4">
                      <button type="button" onClick={() => setSelectedUserId(user.id)} className="text-left">
                        <p className="font-medium">{user.name}</p>
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{user.email}</p>
                      </button>
                    </td>
                    <td className="py-4 pr-4">{user.profileName}</td>
                    <td className="py-4 pr-4">{user.jobTitle}</td>
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
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">Editar usuario selecionado</h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">Ajuste o cadastro e o status do usuario escolhido.</p>
              </div>
            </div>

            {selectedUser ? (
              <form
                onSubmit={editForm.handleSubmit((values) => {
                  const accessRole =
                    values.profileName === selectedUser.profileName
                      ? { role: selectedUser.role, roleLabel: selectedUser.roleLabel }
                      : getAccessRole(values.profileName, profiles);

                  const updates: Partial<ManagedUser> = {
                    name: values.name,
                    email: values.email.trim().toLowerCase(),
                    profileName: values.profileName,
                    jobTitle: values.jobTitle,
                    squad: values.squad,
                    status: values.status,
                    focus: values.squad,
                    ...accessRole,
                  };

                  if (values.password) {
                    updates.password = values.password;
                  }

                  updateUser(selectedUser.id, updates);
                  toast.success(`Cadastro de ${values.name} atualizado com sucesso.`);
                })}
                className="mt-6 grid gap-4"
              >
                <Field label="Nome" error={editForm.formState.errors.name?.message}>
                  <input
                    {...editForm.register("name")}
                    className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                    placeholder="Nome do usuario"
                  />
                </Field>
                <Field label="Email" error={editForm.formState.errors.email?.message}>
                  <input
                    type="email"
                    {...editForm.register("email")}
                    className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                    placeholder="email@flowjl.com"
                  />
                </Field>
                <Field label="Perfil de acesso" error={editForm.formState.errors.profileName?.message}>
                  <select
                    {...editForm.register("profileName")}
                    className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  >
                    {profileOptions.map((profile) => (
                      <option key={profile} value={profile}>
                        {profile}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cargo" error={editForm.formState.errors.jobTitle?.message}>
                  <select
                    {...editForm.register("jobTitle")}
                    className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  >
                    {jobTitleOptions.map((jobTitle) => (
                      <option key={jobTitle} value={jobTitle}>
                        {jobTitle}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Squad" error={editForm.formState.errors.squad?.message}>
                  <input
                    {...editForm.register("squad")}
                    className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                    placeholder="Ex: Diretoria"
                  />
                </Field>
                <Field label="Status" error={editForm.formState.errors.status?.message}>
                  <select
                    {...editForm.register("status")}
                    className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Suspenso">Suspenso</option>
                  </select>
                </Field>

                <div className="mt-2 border-t pt-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[color:var(--primary)]/12 p-2.5 text-[color:var(--primary)]">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold">Senha de acesso</p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        Preencha somente quando quiser alterar a senha atual.
                      </p>
                    </div>
                  </div>
                </div>

                <Field label="Nova senha (opcional)" error={editForm.formState.errors.password?.message}>
                  <input
                    type="password"
                    {...editForm.register("password")}
                    className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                    placeholder="Minimo de 8 caracteres"
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Confirmar nova senha" error={editForm.formState.errors.passwordConfirmation?.message}>
                  <input
                    type="password"
                    {...editForm.register("passwordConfirmation")}
                    className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                </Field>

                <div className="rounded-2xl border bg-white/55 p-4 text-xs leading-5 text-[color:var(--muted-foreground)] dark:bg-white/5">
                  Para trocar a senha, use no minimo 8 caracteres, com letra maiuscula, minuscula e numero.
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)]"
                >
                  Salvar alteracoes
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-3xl border bg-white/70 p-4 text-sm text-[color:var(--muted-foreground)] dark:bg-white/6">
                Nenhum usuario selecionado para edicao.
              </div>
            )}
          </div>

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
              onSubmit={inviteForm.handleSubmit((values) => {
                const normalizedEmail = values.email.trim().toLowerCase();

                if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
                  inviteForm.setError("email", { message: "Ja existe um usuario cadastrado com este email." });
                  return;
                }

                const accessRole = getAccessRole(values.profileName, profiles);
                const newUser: ManagedUser = {
                  id: `u-${normalizedEmail.replace(/[^a-z0-9]/g, "-")}`,
                  name: values.name,
                  email: normalizedEmail,
                  password: values.password,
                  profileName: values.profileName,
                  jobTitle: values.jobTitle,
                  squad: values.squad,
                  status: "Pendente",
                  lastAccess: "Convite enviado",
                  focus: values.squad,
                  ...accessRole,
                };

                addUser(newUser);
                setSelectedUserId(newUser.id);
                toast.success(`Convite enviado para ${values.name}.`);
                inviteForm.reset({
                  name: "",
                  email: "",
                  profileName: values.profileName,
                  jobTitle: values.jobTitle,
                  squad: "",
                  password: "",
                  passwordConfirmation: "",
                });
              })}
              className="mt-6 grid gap-4"
            >
              <Field label="Nome" error={inviteForm.formState.errors.name?.message}>
                <input
                  {...inviteForm.register("name")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Nome do novo usuario"
                />
              </Field>
              <Field label="Email" error={inviteForm.formState.errors.email?.message}>
                <input
                  type="email"
                  {...inviteForm.register("email")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="email@flowjl.com"
                />
              </Field>
              <Field label="Perfil de acesso" error={inviteForm.formState.errors.profileName?.message}>
                <select
                  {...inviteForm.register("profileName")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                >
                  {profileOptions.map((profile) => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cargo" error={inviteForm.formState.errors.jobTitle?.message}>
                <select
                  {...inviteForm.register("jobTitle")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                >
                  {jobTitleOptions.map((jobTitle) => (
                    <option key={jobTitle} value={jobTitle}>
                      {jobTitle}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Squad" error={inviteForm.formState.errors.squad?.message}>
                <input
                  {...inviteForm.register("squad")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Ex: Growth"
                />
              </Field>
              <Field label="Senha temporaria" error={inviteForm.formState.errors.password?.message}>
                <input
                  type="password"
                  {...inviteForm.register("password")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Defina a senha inicial"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirmar senha" error={inviteForm.formState.errors.passwordConfirmation?.message}>
                <input
                  type="password"
                  {...inviteForm.register("passwordConfirmation")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Repita a senha inicial"
                  autoComplete="new-password"
                />
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
  const profiles = useProfileDirectoryStore((state) => state.profiles);
  const addProfile = useProfileDirectoryStore((state) => state.addProfile);
  const updateProfile = useProfileDirectoryStore((state) => state.updateProfile);
  const users = useUserDirectoryStore((state) => state.users);
  const syncUsersForProfile = useUserDirectoryStore((state) => state.syncUsersForProfile);
  const [selectedProfileId, setSelectedProfileId] = useState(initialAccessProfiles[0]?.id ?? "");
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];

  const createForm = useForm<CreateProfileForm>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      name: "",
      focus: "",
      approvals: "Até R$ 15 mil",
      role: "operations",
    },
  });

  const editForm = useForm<CreateProfileForm>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      name: "",
      focus: "",
      approvals: "",
      role: "operations",
    },
  });

  useEffect(() => {
    if (selectedProfile) {
      editForm.reset({
        name: selectedProfile.name,
        focus: selectedProfile.focus,
        approvals: selectedProfile.approvals,
        role: selectedProfile.role,
      });
    }
  }, [editForm, selectedProfile, profiles]);

  function getMemberCount(profileName: string) {
    return users.filter((user) => user.profileName === profileName).length;
  }

  function getRoleLabel(role: RoleKey) {
    return profileRoleOptions.find((option) => option.value === role)?.label ?? "Operações";
  }

  return (
    <section className="page-grid">
      <AdminHero
        page={page}
        icon={<ShieldCheck className="h-5 w-5" />}
        eyebrow="Acesso administrativo"
        title="Perfis e permissoes do portal"
        description="Defina o que cada papel pode visualizar, editar ou aprovar dentro da operacao Flow JL, com uma leitura pronta para evolucao com RBAC real."
        highlights={[
          "Cadastro e edicao persistentes no portal",
          "Matriz de modulos com permissoes editaveis",
          "Usuarios sincronizados quando o perfil muda",
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
              {profiles.map((profile) => {
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
                        {getMemberCount(profile.name)} membros
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-[2rem] border p-6">
            <h3 className="font-display text-xl font-semibold">Cadastrar novo perfil</h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Defina a finalidade, o papel de acesso e o limite de aprovacao inicial.
            </p>

            <form
              data-testid="create-profile-form"
              onSubmit={createForm.handleSubmit((values) => {
                const normalizedName = values.name.trim();

                if (profiles.some((profile) => profile.name.toLowerCase() === normalizedName.toLowerCase())) {
                  createForm.setError("name", { message: "Ja existe um perfil cadastrado com este nome." });
                  return;
                }

                const profile: AccessProfile = {
                  id: `profile-${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${profiles.length + 1}`,
                  name: normalizedName,
                  focus: values.focus,
                  approvals: values.approvals,
                  role: values.role,
                  roleLabel: getRoleLabel(values.role),
                  modules: defaultProfileModules.map((module) => ({ ...module })),
                };

                addProfile(profile);
                setSelectedProfileId(profile.id);
                toast.success(`Perfil ${profile.name} cadastrado com sucesso.`);
                createForm.reset({
                  name: "",
                  focus: "",
                  approvals: "Até R$ 15 mil",
                  role: values.role,
                });
              })}
              className="mt-6 grid gap-4"
            >
              <Field label="Nome do perfil" error={createForm.formState.errors.name?.message}>
                <input
                  {...createForm.register("name")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Ex: Lider de Growth"
                />
              </Field>
              <Field label="Escopo principal" error={createForm.formState.errors.focus?.message}>
                <textarea
                  {...createForm.register("focus")}
                  className="min-h-24 rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Descreva a finalidade e o escopo deste perfil"
                />
              </Field>
              <Field label="Papel de acesso" error={createForm.formState.errors.role?.message}>
                <select
                  {...createForm.register("role")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                >
                  {profileRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Limite de aprovacao" error={createForm.formState.errors.approvals?.message}>
                <input
                  {...createForm.register("approvals")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="R$ 15 mil"
                />
              </Field>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)]"
              >
                Cadastrar perfil
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

          <form
            data-testid="edit-profile-form"
            onSubmit={editForm.handleSubmit((values) => {
              const nextName = values.name.trim();

              if (
                profiles.some(
                  (profile) =>
                    profile.id !== selectedProfile.id && profile.name.toLowerCase() === nextName.toLowerCase(),
                )
              ) {
                editForm.setError("name", { message: "Ja existe outro perfil cadastrado com este nome." });
                return;
              }

              const previousName = selectedProfile.name;
              const roleLabel = getRoleLabel(values.role);

              updateProfile(selectedProfile.id, {
                name: nextName,
                focus: values.focus,
                approvals: values.approvals,
                role: values.role,
                roleLabel,
              });
              syncUsersForProfile(previousName, nextName, values.role, roleLabel);
              toast.success(`Perfil ${nextName} atualizado com sucesso.`);
            })}
            className="mt-6 grid gap-4 rounded-3xl border bg-white/55 p-5 dark:bg-white/5 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <h4 className="font-display text-lg font-semibold">Editar perfil selecionado</h4>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                As alteracoes de nome e papel sao aplicadas aos usuarios vinculados.
              </p>
            </div>
            <Field label="Nome do perfil" error={editForm.formState.errors.name?.message}>
              <input
                data-testid="edit-profile-name"
                {...editForm.register("name")}
                className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
              />
            </Field>
            <Field label="Papel de acesso" error={editForm.formState.errors.role?.message}>
              <select
                data-testid="edit-profile-role"
                {...editForm.register("role")}
                className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
              >
                {profileRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Escopo principal" error={editForm.formState.errors.focus?.message}>
                <textarea
                  data-testid="edit-profile-focus"
                  {...editForm.register("focus")}
                  className="min-h-24 rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                />
              </Field>
            </div>
            <Field label="Limite de aprovacao" error={editForm.formState.errors.approvals?.message}>
              <input
                data-testid="edit-profile-approvals"
                {...editForm.register("approvals")}
                className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
              />
            </Field>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)]"
            >
              Salvar alteracoes do perfil
            </button>
          </form>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Membros vinculados", `${getMemberCount(selectedProfile.name)}`],
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
                  <th className="pb-4 pr-4 font-medium">Permissao editavel</th>
                  <th className="pb-4 pr-4 font-medium">Leitura administrativa</th>
                </tr>
              </thead>
              <tbody>
                {selectedProfile.modules.map((module) => (
                  <tr key={module.name} className="border-t">
                    <td className="py-4 pr-4 font-medium">{module.name}</td>
                    <td className="py-4 pr-4">
                      <select
                        value={module.permission}
                        onChange={(event) => {
                          const permission = event.target.value as ProfilePermission;
                          updateProfile(selectedProfile.id, {
                            modules: selectedProfile.modules.map((entry) =>
                              entry.name === module.name ? { ...entry, permission } : entry,
                            ),
                          });
                          toast.success(`Permissao de ${module.name} atualizada para ${permission}.`);
                        }}
                        className="rounded-xl border bg-white/70 px-3 py-2 text-xs font-semibold dark:bg-white/6"
                        aria-label={`Permissao do modulo ${module.name}`}
                      >
                        <option value="Total">Total</option>
                        <option value="Edicao">Edicao</option>
                        <option value="Leitura">Leitura</option>
                      </select>
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
  const roles = useJobRoleDirectoryStore((state) => state.roles);
  const addRole = useJobRoleDirectoryStore((state) => state.addRole);
  const updateRole = useJobRoleDirectoryStore((state) => state.updateRole);
  const users = useUserDirectoryStore((state) => state.users);
  const syncUsersForJobTitle = useUserDirectoryStore((state) => state.syncUsersForJobTitle);
  const [selectedRoleId, setSelectedRoleId] = useState(initialJobRoles[0]?.id ?? "");
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];

  const createForm = useForm<JobRoleForm>({
    resolver: zodResolver(jobRoleSchema),
    defaultValues: {
      name: "",
      scope: "",
      reportsTo: "Diretoria JL",
      headcount: 1,
      responsibilities: "",
    },
  });

  const editForm = useForm<JobRoleForm>({
    resolver: zodResolver(jobRoleSchema),
    defaultValues: {
      name: "",
      scope: "",
      reportsTo: "",
      headcount: 0,
      responsibilities: "",
    },
  });

  useEffect(() => {
    if (selectedRole) {
      editForm.reset({
        name: selectedRole.name,
        scope: selectedRole.scope,
        reportsTo: selectedRole.reportsTo,
        headcount: selectedRole.headcount,
        responsibilities: selectedRole.responsibilities.join("\n"),
      });
    }
  }, [editForm, roles, selectedRole]);

  function parseResponsibilities(value: string) {
    return value
      .split(/\r?\n/)
      .map((responsibility) => responsibility.trim())
      .filter(Boolean);
  }

  function getMemberCount(roleName: string) {
    return users.filter((user) => user.jobTitle === roleName).length;
  }

  return (
    <section className="page-grid">
      <AdminHero
        page={page}
        icon={<BriefcaseBusiness className="h-5 w-5" />}
        eyebrow="Acesso administrativo"
        title="Cargos e estrutura de responsabilidade"
        description="Organize os cargos do portal web e mantenha a separacao de responsabilidade sob controle total do administrador."
        highlights={[
          "Cadastro e edicao exclusivos do administrador",
          "Usuarios sincronizados quando o cargo muda",
          "Hierarquia e responsabilidades persistidas no portal",
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-5">
          <div className="glass rounded-[2rem] border p-6">
            <h3 className="font-display text-xl font-semibold">Catalogo de cargos</h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Selecione um cargo para revisar ou editar sua estrutura.
            </p>

            <div className="mt-6 space-y-3">
              {roles.map((role) => {
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
                        {getMemberCount(role.name)} usuarios
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-[2rem] border p-6">
            <h3 className="font-display text-xl font-semibold">Cadastrar novo cargo</h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Defina a posicao, a hierarquia e as responsabilidades iniciais.
            </p>

            <form
              data-testid="create-job-role-form"
              onSubmit={createForm.handleSubmit((values) => {
                const normalizedName = values.name.trim();

                if (roles.some((role) => role.name.toLowerCase() === normalizedName.toLowerCase())) {
                  createForm.setError("name", { message: "Ja existe um cargo cadastrado com este nome." });
                  return;
                }

                const role: JobRole = {
                  id: `cargo-${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${roles.length + 1}`,
                  name: normalizedName,
                  scope: values.scope.trim(),
                  reportsTo: values.reportsTo.trim(),
                  headcount: values.headcount,
                  responsibilities: parseResponsibilities(values.responsibilities),
                };

                addRole(role);
                setSelectedRoleId(role.id);
                toast.success(`Cargo ${role.name} cadastrado com sucesso.`);
                createForm.reset({
                  name: "",
                  scope: "",
                  reportsTo: values.reportsTo,
                  headcount: 1,
                  responsibilities: "",
                });
              })}
              className="mt-6 grid gap-4"
            >
              <Field label="Nome do cargo" error={createForm.formState.errors.name?.message}>
                <input
                  {...createForm.register("name")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Ex: Lider de Growth"
                />
              </Field>
              <Field label="Escopo principal" error={createForm.formState.errors.scope?.message}>
                <textarea
                  {...createForm.register("scope")}
                  className="min-h-24 rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Descreva o objetivo principal deste cargo"
                />
              </Field>
              <Field label="Reporta para" error={createForm.formState.errors.reportsTo?.message}>
                <input
                  list="create-role-report-options"
                  {...createForm.register("reportsTo")}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder="Ex: Diretoria JL"
                />
                <datalist id="create-role-report-options">
                  <option value="Diretoria JL" />
                  {roles.map((role) => <option key={role.id} value={role.name} />)}
                </datalist>
              </Field>
              <Field label="Quantidade planejada" error={createForm.formState.errors.headcount?.message}>
                <input
                  type="number"
                  min={0}
                  max={999}
                  {...createForm.register("headcount", { valueAsNumber: true })}
                  className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                />
              </Field>
              <Field label="Responsabilidades" error={createForm.formState.errors.responsibilities?.message}>
                <textarea
                  {...createForm.register("responsibilities")}
                  className="min-h-28 rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                  placeholder={"Informe uma responsabilidade por linha"}
                />
              </Field>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)]"
              >
                Cadastrar cargo
              </button>
            </form>
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

          <form
            data-testid="edit-job-role-form"
            onSubmit={editForm.handleSubmit((values) => {
              const nextName = values.name.trim();

              if (
                roles.some(
                  (role) => role.id !== selectedRole.id && role.name.toLowerCase() === nextName.toLowerCase(),
                )
              ) {
                editForm.setError("name", { message: "Ja existe outro cargo cadastrado com este nome." });
                return;
              }

              const previousName = selectedRole.name;
              updateRole(selectedRole.id, {
                name: nextName,
                scope: values.scope.trim(),
                reportsTo: values.reportsTo.trim(),
                headcount: values.headcount,
                responsibilities: parseResponsibilities(values.responsibilities),
              });
              syncUsersForJobTitle(previousName, nextName);
              toast.success(`Cargo ${nextName} atualizado com sucesso.`);
            })}
            className="mt-6 grid gap-4 rounded-3xl border bg-white/55 p-5 dark:bg-white/5 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <h4 className="font-display text-lg font-semibold">Editar cargo selecionado</h4>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                Mudancas de nome sao aplicadas aos usuarios e subordinados vinculados.
              </p>
            </div>
            <Field label="Nome do cargo" error={editForm.formState.errors.name?.message}>
              <input
                data-testid="edit-job-role-name"
                {...editForm.register("name")}
                className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
              />
            </Field>
            <Field label="Reporta para" error={editForm.formState.errors.reportsTo?.message}>
              <input
                data-testid="edit-job-role-reports-to"
                list="edit-role-report-options"
                {...editForm.register("reportsTo")}
                className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
              />
              <datalist id="edit-role-report-options">
                <option value="Diretoria JL" />
                {roles.filter((role) => role.id !== selectedRole.id).map((role) => (
                  <option key={role.id} value={role.name} />
                ))}
              </datalist>
            </Field>
            <div className="md:col-span-2">
              <Field label="Escopo principal" error={editForm.formState.errors.scope?.message}>
                <textarea
                  data-testid="edit-job-role-scope"
                  {...editForm.register("scope")}
                  className="min-h-24 rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                />
              </Field>
            </div>
            <Field label="Quantidade planejada" error={editForm.formState.errors.headcount?.message}>
              <input
                data-testid="edit-job-role-headcount"
                type="number"
                min={0}
                max={999}
                {...editForm.register("headcount", { valueAsNumber: true })}
                className="rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Responsabilidades" error={editForm.formState.errors.responsibilities?.message}>
                <textarea
                  data-testid="edit-job-role-responsibilities"
                  {...editForm.register("responsibilities")}
                  className="min-h-32 rounded-2xl border bg-white/70 px-4 py-3 text-sm dark:bg-white/6"
                />
              </Field>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--primary)] px-5 py-3 font-medium text-[color:var(--primary-foreground)] md:col-span-2"
            >
              Salvar alteracoes do cargo
            </button>
          </form>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Responsavel por", selectedRole.scope],
              ["Usuarios vinculados", `${getMemberCount(selectedRole.name)}`],
              ["Quantidade planejada", `${selectedRole.headcount}`],
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
                "Mudancas de nome refletem nos usuarios e na hierarquia vinculada.",
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

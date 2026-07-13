import { AuditEvent } from "../models/audit-event.model.js";
import { ClassSchedule } from "../models/class-schedule.model.js";
import { ExternalIntegration } from "../models/external-integration.model.js";
import { Launch } from "../models/launch.model.js";
import { Permission } from "../models/permission.model.js";
import { PlatformSetting } from "../models/platform-setting.model.js";
import { Role } from "../models/role.model.js";
import { Student } from "../models/student.model.js";
import { User } from "../models/user.model.js";
import { UserPreference, userPreferenceThemes } from "../models/user-preference.model.js";
import { auditService } from "./audit.service.js";
import { toPublicUser } from "./user.service.js";

const auxiliaryCatalogs = {
  channels: [
    { code: "INSTAGRAM", label: "Instagram", active: true },
    { code: "YOUTUBE", label: "YouTube", active: true },
    { code: "EMAIL", label: "Email", active: true },
    { code: "WHATSAPP", label: "WhatsApp", active: true },
    { code: "META_ADS", label: "Meta Ads", active: true }
  ],
  categories: [
    { code: "AWARENESS", label: "Awareness", active: true },
    { code: "ENGAGEMENT", label: "Engajamento", active: true },
    { code: "CONVERSION", label: "Conversao", active: true },
    { code: "RETENTION", label: "Retencao", active: true }
  ],
  statuses: [
    { code: "DRAFT", label: "Rascunho", active: true },
    { code: "IN_REVIEW", label: "Em revisao", active: true },
    { code: "APPROVED", label: "Aprovado", active: true },
    { code: "PUBLISHED", label: "Publicado", active: true }
  ]
};

const sectionDefinitions = {
  users: {
    title: "Usuarios",
    description: "Cadastro e governanca de usuarios da plataforma.",
    requiredPermissions: ["USER_LIST"]
  },
  roles: {
    title: "Cargos",
    description: "Matriz de cargos e visibilidade dos niveis de acesso.",
    requiredPermissions: ["ROLE_READ"]
  },
  permissions: {
    title: "Permissoes",
    description: "Leitura da granularidade de acesso usada em menus, rotas e acoes.",
    requiredPermissions: ["PERMISSION_READ"]
  },
  products: {
    title: "Produtos",
    description: "Cadastros auxiliares derivados dos lancamentos existentes.",
    requiredPermissions: ["LAUNCH_READ"]
  },
  classes: {
    title: "Turmas",
    description: "Leitura de turmas e alunos vinculados a operacao.",
    requiredPermissions: ["CLASS_SCHEDULE_READ", "STUDENT_READ"]
  },
  channels: {
    title: "Canais",
    description: "Cadastros auxiliares de canais disponiveis para o front.",
    requiredPermissions: ["PLATFORM_SETTING_READ"]
  },
  categories: {
    title: "Categorias",
    description: "Cadastros auxiliares de categorias operacionais.",
    requiredPermissions: ["PLATFORM_SETTING_READ"]
  },
  statuses: {
    title: "Status",
    description: "Cadastros auxiliares de status e estados visuais do front.",
    requiredPermissions: ["PLATFORM_SETTING_READ"]
  },
  integrations: {
    title: "Integracoes",
    description: "Estado das integracoes externas e sincronizacao mockada.",
    requiredPermissions: ["EXTERNAL_INTEGRATION_READ"]
  },
  audit: {
    title: "Auditoria",
    description: "Historico auditavel da plataforma.",
    requiredPermissions: ["AUDIT_READ"]
  }
};

function normalizeText(value) {
  return value?.trim() ?? null;
}

function normalizeEmail(value) {
  return value?.trim().toLowerCase() ?? null;
}

function hasAnyPermission(userPermissionCodes, requiredPermissionCodes) {
  return requiredPermissionCodes.some((permissionCode) => userPermissionCodes.has(permissionCode));
}

function buildUnauthorizedSection(sectionKey, definition) {
  return {
    sectionKey,
    title: definition.title,
    authorized: false,
    hiddenActions: ["view", "create", "edit", "delete"],
    experience: {
      code: "UNAUTHORIZED_SETTINGS_SECTION",
      title: "Acesso nao autorizado",
      description: `Seu perfil nao possui acesso a configuracao "${definition.title}".`,
      guidance: "O front pode ocultar acoes indevidas e exibir uma tela de bloqueio com orientacao contextual."
    }
  };
}

function toPublicPreference(user, preference) {
  return {
    user: {
      ...toPublicUser(user),
      roleCode: user.roleCode ?? null
    },
    profile: {
      displayName: preference.personalProfile?.displayName ?? user.name,
      jobTitle: preference.personalProfile?.jobTitle ?? null,
      phone: preference.personalProfile?.phone ?? null,
      avatarUrl: preference.personalProfile?.avatarUrl ?? null
    },
    preferences: {
      theme: preference.theme,
      locale: preference.locale,
      timezone: preference.timezone,
      compactSidebar: preference.compactSidebar
    },
    notifications: {
      email: preference.notifications?.email ?? true,
      push: preference.notifications?.push ?? true,
      approvals: preference.notifications?.approvals ?? true,
      operations: preference.notifications?.operations ?? true,
      reports: preference.notifications?.reports ?? false
    },
    availableThemes: [...userPreferenceThemes],
    availableActions: {
      canEditProfile: true,
      canEditPreferences: true,
      canEditNotifications: true
    }
  };
}

async function resolveUserContext(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId);

  if (!user || user.status !== "ACTIVE") {
    throw {
      statusCode: 401,
      message: "Authenticated user not found"
    };
  }

  const role = await Role.findOne({
    _id: user.roleId,
    active: true
  });

  if (!role) {
    throw {
      statusCode: 403,
      message: "Access denied"
    };
  }

  const permissions = await Permission.find(
    {
      _id: {
        $in: role.permissionIds
      },
      active: true
    },
    { code: 1, module: 1 }
  ).sort({ code: 1 });

  return {
    user,
    role,
    permissions,
    permissionCodes: new Set(permissions.map((permission) => permission.code))
  };
}

async function ensurePreference(user) {
  let preference = await UserPreference.findOne({ userId: user.id });

  if (!preference) {
    preference = await UserPreference.create({
      userId: user.id,
      personalProfile: {
        displayName: user.name
      },
      createdBy: user.id,
      updatedBy: user.id
    });
  }

  return preference;
}

function buildActionsForSection(sectionKey, authorized) {
  if (!authorized) {
    return [];
  }

  const defaults = {
    users: ["view", "invite", "edit", "activate", "deactivate"],
    roles: ["view", "editPermissions"],
    permissions: ["view"],
    products: ["view", "filter"],
    classes: ["view", "filter"],
    channels: ["view", "edit"],
    categories: ["view", "edit"],
    statuses: ["view", "edit"],
    integrations: ["view", "configure", "sync"],
    audit: ["view", "filter", "export"]
  };

  return defaults[sectionKey] ?? ["view"];
}

async function loadUsersSection() {
  const users = await User.find().sort({ createdAt: -1 });

  return {
    items: users.map((user) => toPublicUser(user)),
    total: users.length,
    forms: ["userForm", "statusAction"],
    actions: buildActionsForSection("users", true)
  };
}

async function loadRolesSection() {
  const roles = await Role.find({ active: true }).sort({ code: 1 });

  return {
    items: roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      permissionIdsCount: role.permissionIds.length
    })),
    total: roles.length,
    forms: ["roleMetadataForm", "permissionMatrix"],
    actions: buildActionsForSection("roles", true)
  };
}

async function loadPermissionsSection() {
  const permissions = await Permission.find({ active: true }).sort({ module: 1, code: 1 });

  return {
    items: permissions.map((permission) => ({
      id: permission.id,
      code: permission.code,
      name: permission.name,
      module: permission.module,
      description: permission.description
    })),
    total: permissions.length,
    forms: [],
    actions: buildActionsForSection("permissions", true)
  };
}

async function loadProductsSection() {
  const launches = await Launch.find({ active: true }).sort({ product: 1, name: 1 });
  const grouped = [...new Set(launches.map((launch) => launch.product).filter(Boolean))].map((product) => ({
    product,
    launchesCount: launches.filter((launch) => launch.product === product).length
  }));

  return {
    items: grouped,
    total: grouped.length,
    forms: ["productReferenceForm"],
    actions: buildActionsForSection("products", true)
  };
}

async function loadClassesSection() {
  const [classes, students] = await Promise.all([
    ClassSchedule.find({ active: true }).sort({ scheduledAt: -1 }),
    Student.find({ active: true }).sort({ createdAt: -1 })
  ]);

  return {
    items: {
      classes: classes.map((classItem) => ({
        id: classItem.id,
        title: classItem.title,
        status: classItem.status,
        responsible: classItem.responsible,
        scheduledAt: classItem.scheduledAt
      })),
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        status: student.status
      }))
    },
    total: classes.length + students.length,
    forms: ["classForm", "studentForm"],
    actions: buildActionsForSection("classes", true)
  };
}

function loadAuxiliarySection(sectionKey) {
  const items = auxiliaryCatalogs[sectionKey] ?? [];

  return {
    items,
    total: items.length,
    forms: [`${sectionKey}Form`],
    actions: buildActionsForSection(sectionKey, true)
  };
}

async function loadIntegrationsSection() {
  const integrations = await ExternalIntegration.find({ active: true }).sort({ provider: 1, name: 1 });

  return {
    items: integrations.map((integration) => ({
      id: integration.id,
      provider: integration.provider,
      name: integration.name,
      syncState: integration.syncState,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt ?? null
    })),
    total: integrations.length,
    forms: ["integrationForm", "credentialState"],
    actions: buildActionsForSection("integrations", true)
  };
}

async function loadAuditSection() {
  const events = await AuditEvent.find().sort({ occurredAt: -1 });

  return {
    items: events.slice(0, 50).map((event) => ({
      id: event.id,
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      occurredAt: event.occurredAt
    })),
    total: events.length,
    forms: ["auditFilters"],
    actions: buildActionsForSection("audit", true)
  };
}

const sectionLoaders = {
  users: loadUsersSection,
  roles: loadRolesSection,
  permissions: loadPermissionsSection,
  products: loadProductsSection,
  classes: loadClassesSection,
  channels: async () => loadAuxiliarySection("channels"),
  categories: async () => loadAuxiliarySection("categories"),
  statuses: async () => loadAuxiliarySection("statuses"),
  integrations: loadIntegrationsSection,
  audit: loadAuditSection
};

class SettingsService {
  async getPersonalSettings(authenticatedUserId) {
    const { user, role } = await resolveUserContext(authenticatedUserId);
    const preference = await ensurePreference(user);

    return toPublicPreference({
      ...user.toObject?.() ?? user,
      roleCode: role.code
    }, preference);
  }

  async updatePersonalSettings(authenticatedUserId, data) {
    const { user, role } = await resolveUserContext(authenticatedUserId);
    const preference = await ensurePreference(user);
    const previousEmail = user.email;

    if (data.email) {
      const normalizedEmail = normalizeEmail(data.email);
      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser && existingUser.id !== user.id) {
        throw {
          statusCode: 409,
          message: "A user with this email already exists"
        };
      }

      user.email = normalizedEmail;
    }

    if (data.name) {
      user.name = data.name.trim();
    }

    await user.save();

    preference.theme = data.preferences?.theme ?? preference.theme;
    preference.locale = data.preferences?.locale ?? preference.locale;
    preference.timezone = data.preferences?.timezone ?? preference.timezone;
    preference.compactSidebar = data.preferences?.compactSidebar ?? preference.compactSidebar;
    preference.personalProfile = {
      displayName: normalizeText(data.profile?.displayName) ?? preference.personalProfile?.displayName ?? user.name,
      jobTitle: normalizeText(data.profile?.jobTitle) ?? preference.personalProfile?.jobTitle ?? null,
      phone: normalizeText(data.profile?.phone) ?? preference.personalProfile?.phone ?? null,
      avatarUrl: normalizeText(data.profile?.avatarUrl) ?? preference.personalProfile?.avatarUrl ?? null
    };
    preference.notifications = {
      email: data.notifications?.email ?? preference.notifications?.email ?? true,
      push: data.notifications?.push ?? preference.notifications?.push ?? true,
      approvals: data.notifications?.approvals ?? preference.notifications?.approvals ?? true,
      operations: data.notifications?.operations ?? preference.notifications?.operations ?? true,
      reports: data.notifications?.reports ?? preference.notifications?.reports ?? false
    };
    preference.updatedBy = authenticatedUserId;
    await preference.save();

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "USER_PREFERENCES_UPDATED",
      targetType: "USER_PREFERENCE",
      targetId: preference.id,
      context: {
        userId: user.id,
        previousEmail,
        nextEmail: user.email,
        theme: preference.theme
      }
    });

    return toPublicPreference({
      ...user.toObject?.() ?? user,
      roleCode: role.code
    }, preference);
  }

  async getAdminOverview(authenticatedUserId) {
    const { role, permissionCodes } = await resolveUserContext(authenticatedUserId);
    const settings = await PlatformSetting.find({}).sort({ module: 1, key: 1 });

    const sections = Object.entries(sectionDefinitions).map(([sectionKey, definition]) => {
      const authorized = hasAnyPermission(permissionCodes, definition.requiredPermissions);

      return {
        sectionKey,
        title: definition.title,
        description: definition.description,
        authorized,
        actions: buildActionsForSection(sectionKey, authorized),
        requiredPermissions: definition.requiredPermissions
      };
    });

    return {
      administrative: {
        isolatedFromPersonalPreferences: true,
        currentRole: role.code,
        sections,
        platformSettingsSummary: {
          total: settings.length,
          editable: settings.filter((setting) => setting.editable).length
        }
      }
    };
  }

  async getSection(authenticatedUserId, sectionKey) {
    const definition = sectionDefinitions[sectionKey];

    if (!definition) {
      throw {
        statusCode: 404,
        message: "Settings section not found"
      };
    }

    const { permissionCodes } = await resolveUserContext(authenticatedUserId);
    const authorized = hasAnyPermission(permissionCodes, definition.requiredPermissions);

    if (!authorized) {
      return buildUnauthorizedSection(sectionKey, definition);
    }

    const loader = sectionLoaders[sectionKey];
    const payload = loader ? await loader() : { items: [], total: 0, forms: [], actions: buildActionsForSection(sectionKey, true) };

    return {
      sectionKey,
      title: definition.title,
      description: definition.description,
      authorized: true,
      items: payload.items,
      total: payload.total,
      forms: payload.forms,
      actions: payload.actions
    };
  }
}

export const settingsService = new SettingsService();

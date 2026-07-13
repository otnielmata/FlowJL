import { beforeEach, describe, expect, it, vi } from "vitest";

const userModel = {
  findById: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn()
};

const roleModel = {
  findOne: vi.fn(),
  find: vi.fn()
};

const permissionModel = {
  find: vi.fn()
};

const userPreferenceModel = {
  findOne: vi.fn(),
  create: vi.fn()
};

const launchModel = {
  find: vi.fn()
};

const classScheduleModel = {
  find: vi.fn()
};

const studentModel = {
  find: vi.fn()
};

const externalIntegrationModel = {
  find: vi.fn()
};

const auditEventModel = {
  find: vi.fn()
};

const platformSettingModel = {
  find: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/user.model.js", () => ({ User: userModel }));
vi.mock("../src/models/role.model.js", () => ({ Role: roleModel }));
vi.mock("../src/models/permission.model.js", () => ({ Permission: permissionModel }));
vi.mock("../src/models/user-preference.model.js", () => ({
  UserPreference: userPreferenceModel,
  userPreferenceThemes: ["LIGHT", "DARK", "SYSTEM"]
}));
vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/models/class-schedule.model.js", () => ({ ClassSchedule: classScheduleModel }));
vi.mock("../src/models/student.model.js", () => ({ Student: studentModel }));
vi.mock("../src/models/external-integration.model.js", () => ({ ExternalIntegration: externalIntegrationModel }));
vi.mock("../src/models/audit-event.model.js", () => ({ AuditEvent: auditEventModel }));
vi.mock("../src/models/platform-setting.model.js", () => ({ PlatformSetting: platformSettingModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));

const { settingsService } = await import("../src/services/settings.service.js");

function queryMock(value) {
  return {
    sort: vi.fn().mockResolvedValue(value)
  };
}

function buildUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Ana Silva",
    email: "ana@example.com",
    status: "ACTIVE",
    roleId: "role-1",
    save: vi.fn().mockResolvedValue(undefined),
    toObject() {
      return { ...this };
    },
    ...overrides
  };
}

function buildPreference(overrides = {}) {
  return {
    id: "pref-1",
    userId: "user-1",
    theme: "SYSTEM",
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    compactSidebar: false,
    personalProfile: {
      displayName: "Ana",
      jobTitle: "Operacoes",
      phone: null,
      avatarUrl: null
    },
    notifications: {
      email: true,
      push: true,
      approvals: true,
      operations: true,
      reports: false
    },
    updatedBy: null,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe("settingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const user = buildUser();
    userModel.findById.mockResolvedValue(user);
    roleModel.findOne.mockResolvedValue({
      id: "role-1",
      code: "ADMIN",
      permissionIds: ["perm-1", "perm-2", "perm-3", "perm-4"],
      active: true
    });
    permissionModel.find.mockReturnValue(queryMock([
      { code: "USER_LIST", module: "user" },
      { code: "ROLE_READ", module: "role" },
      { code: "PERMISSION_READ", module: "permission" },
      { code: "AUDIT_READ", module: "audit" },
      { code: "PLATFORM_SETTING_READ", module: "settings" },
      { code: "EXTERNAL_INTEGRATION_READ", module: "content" },
      { code: "CLASS_SCHEDULE_READ", module: "operations" },
      { code: "STUDENT_READ", module: "operations" }
    ]));
    userPreferenceModel.findOne.mockResolvedValue(buildPreference());
    auditServiceMock.record.mockResolvedValue(undefined);
    platformSettingModel.find.mockReturnValue(queryMock([{ id: "setting-1", editable: true }, { id: "setting-2", editable: false }]));
    userModel.find.mockReturnValue(queryMock([buildUser()]));
    roleModel.find.mockReturnValue(queryMock([{ id: "role-1", code: "ADMIN", name: "Administrador", description: "Desc", permissionIds: ["perm-1"] }]));
    launchModel.find.mockReturnValue(queryMock([{ id: "launch-1", name: "L1", product: "Mentoria", active: true }]));
    classScheduleModel.find.mockReturnValue(queryMock([{ id: "class-1", title: "Turma A", status: "SCHEDULED", responsible: "Ana", scheduledAt: new Date("2026-07-20T10:00:00.000Z") }]));
    studentModel.find.mockReturnValue(queryMock([{ id: "student-1", name: "Joao", email: "joao@example.com", status: "ACTIVE" }]));
    externalIntegrationModel.find.mockReturnValue(queryMock([{ id: "integration-1", provider: "META", name: "Meta", syncState: "READY", status: "READY", lastSyncAt: null }]));
    auditEventModel.find.mockReturnValue(queryMock([{ id: "audit-1", actorUserId: "user-1", action: "LOGIN", targetType: "AUTH", targetId: "user-1", occurredAt: new Date("2026-07-13T12:00:00.000Z") }]));
  });

  it("returns personal settings with profile, preferences, theme and notifications", async () => {
    const result = await settingsService.getPersonalSettings("user-1");

    expect(result.user.email).toBe("ana@example.com");
    expect(result.profile.displayName).toBe("Ana");
    expect(result.preferences.theme).toBe("SYSTEM");
    expect(result.notifications.operations).toBe(true);
    expect(result.availableThemes).toEqual(["LIGHT", "DARK", "SYSTEM"]);
  });

  it("updates personal settings and records audit trail", async () => {
    const user = buildUser();
    userModel.findById.mockResolvedValue(user);
    const preference = buildPreference();
    userPreferenceModel.findOne.mockResolvedValue(preference);

    const result = await settingsService.updatePersonalSettings("user-1", {
      name: "Ana Clara",
      preferences: {
        theme: "DARK",
        compactSidebar: true
      },
      notifications: {
        reports: true
      }
    });

    expect(user.save).toHaveBeenCalled();
    expect(preference.save).toHaveBeenCalled();
    expect(result.user.name).toBe("Ana Clara");
    expect(result.preferences.theme).toBe("DARK");
    expect(result.notifications.reports).toBe(true);
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "USER_PREFERENCES_UPDATED",
      targetType: "USER_PREFERENCE"
    }));
  });

  it("returns administrative overview with isolated sections and visibility by permissions", async () => {
    const result = await settingsService.getAdminOverview("user-1");

    expect(result.administrative.isolatedFromPersonalPreferences).toBe(true);
    expect(result.administrative.sections.find((section) => section.sectionKey === "users")?.authorized).toBe(true);
    expect(result.administrative.platformSettingsSummary.total).toBe(2);
  });

  it("returns authorized administrative section payloads with lists, forms and actions", async () => {
    const result = await settingsService.getSection("user-1", "integrations");

    expect(result.authorized).toBe(true);
    expect(result.sectionKey).toBe("integrations");
    expect(result.actions).toContain("sync");
    expect(result.total).toBe(1);
  });

  it("returns unauthorized experience when the user lacks access to a section", async () => {
    permissionModel.find.mockReturnValue(queryMock([{ code: "SETTINGS_PERSONAL_READ", module: "settings" }]));

    const result = await settingsService.getSection("user-1", "audit");

    expect(result.authorized).toBe(false);
    expect(result.experience.code).toBe("UNAUTHORIZED_SETTINGS_SECTION");
    expect(result.hiddenActions).toContain("edit");
  });
});

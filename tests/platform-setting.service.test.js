import { beforeEach, describe, expect, it, vi } from "vitest";

const platformSettingModel = {
  updateOne: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn()
};
const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/platform-setting.model.js", () => ({
  PlatformSetting: platformSettingModel,
  platformSettingValueTypes: ["STRING", "NUMBER", "BOOLEAN", "JSON"]
}));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));

const { platformSettingService, defaultPlatformSettings } = await import("../src/services/platform-setting.service.js");

function queryMock(value) {
  return {
    sort: vi.fn().mockResolvedValue(value)
  };
}

function buildSetting(overrides = {}) {
  return {
    id: "setting-id",
    key: "security.passwordResetTokenTtlMinutes",
    label: "Expiracao do token de recuperacao de senha",
    description: "Tempo em minutos para expiracao de tokens de recuperacao de senha.",
    module: "security",
    valueType: "NUMBER",
    value: 30,
    editable: true,
    sensitive: false,
    createdAt: new Date("2026-07-12T12:00:00.000Z"),
    updatedAt: new Date("2026-07-12T12:00:00.000Z"),
    updatedBy: null,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe("platformSettingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    platformSettingModel.updateOne.mockResolvedValue({ upsertedCount: 0 });
  });

  it("lists readable platform settings without exposing sensitive values", async () => {
    platformSettingModel.find.mockReturnValue(queryMock([
      buildSetting(),
      buildSetting({
        id: "sensitive-setting-id",
        key: "integrations.internalWebhookSecret",
        label: "Segredo interno",
        module: "integrations",
        valueType: "STRING",
        value: "secret-value",
        editable: false,
        sensitive: true
      })
    ]));

    const result = await platformSettingService.list();

    expect(platformSettingModel.updateOne).toHaveBeenCalledTimes(defaultPlatformSettings.length);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(30);
    expect(result[1].value).toBeNull();
  });

  it("updates an editable setting with audit trail", async () => {
    const setting = buildSetting();
    platformSettingModel.findOne.mockResolvedValue(setting);

    const result = await platformSettingService.update("admin-id", "security.passwordResetTokenTtlMinutes", {
      value: 45
    });

    expect(setting.value).toBe(45);
    expect(setting.updatedBy).toBe("admin-id");
    expect(setting.save).toHaveBeenCalled();
    expect(result.value).toBe(45);
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "admin-id",
      action: "PLATFORM_SETTING_UPDATED",
      targetType: "PLATFORM_SETTING",
      targetId: "setting-id",
      context: {
        key: "security.passwordResetTokenTtlMinutes",
        module: "security",
        previousValue: 30,
        nextValue: 45
      }
    });
  });

  it("rejects non-editable settings", async () => {
    platformSettingModel.findOne.mockResolvedValue(buildSetting({
      editable: false
    }));

    await expect(
      platformSettingService.update("admin-id", "integrations.internalWebhookSecret", {
        value: "new-secret"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Platform setting is not editable"
    });
  });

  it("rejects invalid value type", async () => {
    platformSettingModel.findOne.mockResolvedValue(buildSetting());

    await expect(
      platformSettingService.update("admin-id", "security.passwordResetTokenTtlMinutes", {
        value: "45"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Platform setting value type is invalid"
    });
  });
});

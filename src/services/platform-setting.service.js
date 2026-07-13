import { PlatformSetting } from "../models/platform-setting.model.js";
import { auditService } from "./audit.service.js";

const defaultPlatformSettings = [
  {
    key: "security.passwordResetTokenTtlMinutes",
    label: "Expiracao do token de recuperacao de senha",
    description: "Tempo em minutos para expiracao de tokens de recuperacao de senha.",
    module: "security",
    valueType: "NUMBER",
    value: 30,
    editable: true,
    sensitive: false
  },
  {
    key: "security.requireStrongPasswords",
    label: "Exigir senhas fortes",
    description: "Define se a plataforma exige politica reforcada de senhas.",
    module: "security",
    valueType: "BOOLEAN",
    value: true,
    editable: true,
    sensitive: false
  },
  {
    key: "operations.defaultTimezone",
    label: "Fuso horario operacional padrao",
    description: "Fuso horario usado como referencia operacional para exibicao e agendamento.",
    module: "operations",
    valueType: "STRING",
    value: "America/Sao_Paulo",
    editable: true,
    sensitive: false
  },
  {
    key: "integrations.internalWebhookSecret",
    label: "Segredo interno de webhooks",
    description: "Valor sensivel usado por integracoes internas.",
    module: "integrations",
    valueType: "STRING",
    value: "managed-outside-api",
    editable: false,
    sensitive: true
  }
];

function assertValueType(valueType, value) {
  const valid =
    (valueType === "STRING" && typeof value === "string") ||
    (valueType === "NUMBER" && typeof value === "number" && Number.isFinite(value)) ||
    (valueType === "BOOLEAN" && typeof value === "boolean") ||
    (valueType === "JSON" && value !== null && typeof value === "object" && !Array.isArray(value));

  if (!valid) {
    throw {
      statusCode: 400,
      message: "Platform setting value type is invalid"
    };
  }
}

function toPublicPlatformSetting(setting) {
  return {
    id: setting.id,
    key: setting.key,
    label: setting.label,
    description: setting.description,
    module: setting.module,
    valueType: setting.valueType,
    value: setting.sensitive ? null : setting.value,
    editable: setting.editable,
    sensitive: setting.sensitive,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
    updatedBy: setting.updatedBy ?? null
  };
}

async function ensureDefaultSettings() {
  for (const setting of defaultPlatformSettings) {
    await PlatformSetting.updateOne(
      { key: setting.key },
      {
        $setOnInsert: setting
      },
      { upsert: true }
    );
  }
}

class PlatformSettingService {
  async list() {
    await ensureDefaultSettings();

    const settings = await PlatformSetting.find({}).sort({ module: 1, key: 1 });
    return settings.map((setting) => toPublicPlatformSetting(setting));
  }

  async update(authenticatedUserId, key, data) {
    await ensureDefaultSettings();

    const setting = await PlatformSetting.findOne({ key });

    if (!setting) {
      throw {
        statusCode: 404,
        message: "Platform setting not found"
      };
    }

    if (!setting.editable) {
      throw {
        statusCode: 409,
        message: "Platform setting is not editable"
      };
    }

    assertValueType(setting.valueType, data.value);

    const previousValue = setting.sensitive ? "[REDACTED]" : setting.value;
    setting.value = data.value;
    setting.updatedBy = authenticatedUserId;
    await setting.save();

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "PLATFORM_SETTING_UPDATED",
      targetType: "PLATFORM_SETTING",
      targetId: setting.id,
      context: {
        key: setting.key,
        module: setting.module,
        previousValue,
        nextValue: setting.sensitive ? "[REDACTED]" : setting.value
      }
    });

    return toPublicPlatformSetting(setting);
  }
}

export const platformSettingService = new PlatformSettingService();
export { defaultPlatformSettings, ensureDefaultSettings, toPublicPlatformSetting };

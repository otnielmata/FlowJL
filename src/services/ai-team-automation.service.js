import { randomUUID } from "node:crypto";

import { AiTeamAutomation } from "../models/ai-team-automation.model.js";
import { Launch } from "../models/launch.model.js";
import { Permission } from "../models/permission.model.js";
import { auditService } from "./audit.service.js";

function sanitizePayloadTemplate(payloadTemplate = {}) {
  const { secret, token, password, apiKey, ...safePayload } = payloadTemplate;
  return safePayload;
}

function toPublicTeamAutomation(automation) {
  return {
    id: automation.id,
    name: automation.name,
    description: automation.description,
    trigger: automation.trigger,
    rule: automation.rule,
    action: {
      type: automation.action.type,
      targetModule: automation.action.targetModule,
      payloadTemplate: sanitizePayloadTemplate(automation.action.payloadTemplate)
    },
    active: automation.active,
    executions: (automation.executions ?? []).map((execution) => ({
      id: execution.id,
      status: execution.status,
      triggeredBy: execution.triggeredBy,
      triggeredAt: execution.triggeredAt,
      triggerPayload: execution.triggerPayload ?? {},
      result: execution.result ?? {},
      errorMessage: execution.errorMessage ?? null
    })),
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
    createdBy: automation.createdBy ?? null,
    updatedBy: automation.updatedBy ?? null
  };
}

async function ensurePermissionExists(permissionCode) {
  const permission = await Permission.findOne({ code: permissionCode, active: true });

  if (!permission) {
    throw {
      statusCode: 400,
      message: "Automation rule requires a valid active permission"
    };
  }
}

async function ensureBusinessContext(rule) {
  if (rule.contextType === "GLOBAL") {
    if (!rule.allowGlobalContext) {
      throw {
        statusCode: 400,
        message: "Automation with global context requires explicit allowGlobalContext"
      };
    }

    return;
  }

  if (!rule.contextId) {
    throw {
      statusCode: 400,
      message: "Automation rule requires business context"
    };
  }

  if (rule.contextType === "LAUNCH") {
    const launch = await Launch.findById(rule.contextId);

    if (!launch || launch.active === false) {
      throw {
        statusCode: 404,
        message: "Launch not found"
      };
    }
  }
}

async function ensureSafeAutomation(data) {
  if (!data.rule?.requiredPermission) {
    throw {
      statusCode: 400,
      message: "Automation rule requires authorization control"
    };
  }

  await ensurePermissionExists(data.rule.requiredPermission);
  await ensureBusinessContext(data.rule);

  if (data.trigger.type === "EVENT" && !data.trigger.eventName) {
    throw {
      statusCode: 400,
      message: "Event automations require eventName"
    };
  }

  if (data.trigger.type === "SCHEDULED" && !data.trigger.scheduleExpression) {
    throw {
      statusCode: 400,
      message: "Scheduled automations require scheduleExpression"
    };
  }

  if (!data.action?.targetModule) {
    throw {
      statusCode: 400,
      message: "Automation action requires targetModule"
    };
  }
}

function buildExecutionResult(automation, triggerPayload = {}) {
  return {
    actionType: automation.action.type,
    targetModule: automation.action.targetModule,
    contextType: automation.rule.contextType,
    contextId: automation.rule.contextId ?? null,
    message: `Automation action ${automation.action.type} prepared for ${automation.action.targetModule}.`,
    payload: sanitizePayloadTemplate({
      ...automation.action.payloadTemplate,
      ...triggerPayload
    })
  };
}

class AiTeamAutomationService {
  async create(authenticatedUserId, data) {
    if (data.active) {
      await ensureSafeAutomation(data);
    }

    const automation = await AiTeamAutomation.create({
      name: data.name.trim(),
      description: data.description.trim(),
      trigger: data.trigger,
      rule: {
        ...data.rule,
        conditions: data.rule.conditions ?? []
      },
      action: {
        ...data.action,
        payloadTemplate: sanitizePayloadTemplate(data.action.payloadTemplate),
        secretConfig: data.action.secretConfig ?? null
      },
      active: data.active ?? false,
      executions: [],
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_TEAM_AUTOMATION_CREATED",
      targetType: "AI_TEAM_AUTOMATION",
      targetId: automation.id,
      context: {
        triggerType: automation.trigger.type,
        actionType: automation.action.type,
        contextType: automation.rule.contextType,
        active: automation.active
      }
    });

    return toPublicTeamAutomation(automation);
  }

  async getById(automationId) {
    const automation = await AiTeamAutomation.findById(automationId);

    if (!automation) {
      throw {
        statusCode: 404,
        message: "Team automation not found"
      };
    }

    return toPublicTeamAutomation(automation);
  }

  async setActive(authenticatedUserId, automationId, active) {
    const automation = await AiTeamAutomation.findById(automationId);

    if (!automation) {
      throw {
        statusCode: 404,
        message: "Team automation not found"
      };
    }

    if (active) {
      await ensureSafeAutomation(automation);
    }

    await AiTeamAutomation.updateOne(
      { _id: automationId },
      {
        $set: {
          active,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: active ? "AI_TEAM_AUTOMATION_ACTIVATED" : "AI_TEAM_AUTOMATION_DEACTIVATED",
      targetType: "AI_TEAM_AUTOMATION",
      targetId: automation.id,
      context: {
        triggerType: automation.trigger.type,
        actionType: automation.action.type
      }
    });

    return toPublicTeamAutomation({
      ...automation.toObject(),
      id: automation.id,
      active,
      updatedBy: authenticatedUserId
    });
  }

  async execute(authenticatedUserId, automationId, triggerPayload = {}) {
    const automation = await AiTeamAutomation.findById(automationId);

    if (!automation) {
      throw {
        statusCode: 404,
        message: "Team automation not found"
      };
    }

    if (!automation.active) {
      throw {
        statusCode: 409,
        message: "Only active automations can be executed"
      };
    }

    await ensureSafeAutomation(automation);

    if (triggerPayload.type && triggerPayload.type !== automation.trigger.type) {
      throw {
        statusCode: 409,
        message: "Automation trigger payload does not match configured trigger"
      };
    }

    const execution = {
      id: randomUUID(),
      status: "SUCCEEDED",
      triggeredBy: authenticatedUserId,
      triggeredAt: new Date(),
      triggerPayload: sanitizePayloadTemplate(triggerPayload),
      result: buildExecutionResult(automation, triggerPayload),
      errorMessage: null
    };

    await AiTeamAutomation.updateOne(
      { _id: automationId },
      {
        $push: { executions: execution },
        $set: { updatedBy: authenticatedUserId }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_TEAM_AUTOMATION_EXECUTED",
      targetType: "AI_TEAM_AUTOMATION",
      targetId: automation.id,
      context: {
        executionId: execution.id,
        status: execution.status,
        actionType: automation.action.type,
        contextType: automation.rule.contextType,
        contextId: automation.rule.contextId ?? null
      }
    });

    return {
      automation: toPublicTeamAutomation({
        ...automation.toObject(),
        id: automation.id,
        executions: [...(automation.executions ?? []), execution],
        updatedBy: authenticatedUserId
      }),
      execution
    };
  }
}

export const aiTeamAutomationService = new AiTeamAutomationService();
export { toPublicTeamAutomation };

import { beforeEach, describe, expect, it, vi } from "vitest";

const aiTeamAutomationModel = {
  create: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};
const launchModel = {
  findById: vi.fn()
};
const permissionModel = {
  findOne: vi.fn()
};
const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/ai-team-automation.model.js", () => ({
  AiTeamAutomation: aiTeamAutomationModel,
  aiTeamAutomationTriggerTypes: ["SCHEDULED", "EVENT", "MANUAL"],
  aiTeamAutomationContextTypes: ["LAUNCH", "GLOBAL", "OPERATION"],
  aiTeamAutomationActionTypes: ["CREATE_OPERATIONAL_CHECKLIST", "CREATE_SUPPORT_TICKET", "SEND_OPERATIONAL_REMINDER", "REGISTER_OPERATION_LOG"],
  aiTeamAutomationExecutionStatuses: ["SUCCEEDED", "FAILED", "SKIPPED"]
}));
vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/models/permission.model.js", () => ({ Permission: permissionModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));

const { aiTeamAutomationService } = await import("../src/services/ai-team-automation.service.js");

function buildAutomation(overrides = {}) {
  return {
    id: "automation-id",
    name: "Checklist diario do lancamento",
    description: "Automatiza a criacao de checklist operacional recorrente.",
    trigger: {
      type: "SCHEDULED",
      scheduleExpression: "0 9 * * 1-5",
      eventName: null
    },
    rule: {
      contextType: "LAUNCH",
      contextId: "launch-id",
      requiredPermission: "OPERATIONAL_CHECKLIST_CREATE",
      allowGlobalContext: false,
      conditions: ["launch.active = true"]
    },
    action: {
      type: "CREATE_OPERATIONAL_CHECKLIST",
      targetModule: "operational-checklists",
      payloadTemplate: {
        title: "Checklist diario",
        secret: "must-not-leak"
      },
      secretConfig: {
        token: "must-not-leak"
      }
    },
    active: true,
    executions: [],
    createdAt: new Date("2026-07-12T12:00:00.000Z"),
    updatedAt: new Date("2026-07-12T12:00:00.000Z"),
    createdBy: "leader-id",
    updatedBy: "leader-id",
    toObject() {
      return { ...this };
    },
    ...overrides
  };
}

describe("aiTeamAutomationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    permissionModel.findOne.mockResolvedValue({ code: "OPERATIONAL_CHECKLIST_CREATE", active: true });
    launchModel.findById.mockResolvedValue({ id: "launch-id", active: true });
  });

  it("creates a safe recurring automation with trigger, rule and action", async () => {
    aiTeamAutomationModel.create.mockResolvedValue(buildAutomation());

    const result = await aiTeamAutomationService.create("leader-id", {
      name: "Checklist diario do lancamento",
      description: "Automatiza a criacao de checklist operacional recorrente.",
      trigger: {
        type: "SCHEDULED",
        scheduleExpression: "0 9 * * 1-5"
      },
      rule: {
        contextType: "LAUNCH",
        contextId: "launch-id",
        requiredPermission: "OPERATIONAL_CHECKLIST_CREATE",
        conditions: ["launch.active = true"]
      },
      action: {
        type: "CREATE_OPERATIONAL_CHECKLIST",
        targetModule: "operational-checklists",
        payloadTemplate: {
          title: "Checklist diario",
          secret: "must-not-leak"
        },
        secretConfig: {
          token: "must-not-leak"
        }
      },
      active: true
    });

    expect(permissionModel.findOne).toHaveBeenCalledWith({ code: "OPERATIONAL_CHECKLIST_CREATE", active: true });
    expect(launchModel.findById).toHaveBeenCalledWith("launch-id");
    expect(aiTeamAutomationModel.create).toHaveBeenCalledWith(expect.objectContaining({
      active: true,
      createdBy: "leader-id",
      action: expect.objectContaining({
        payloadTemplate: {
          title: "Checklist diario"
        }
      })
    }));
    expect(result.action.payloadTemplate).not.toHaveProperty("secret");
    expect(result.action).not.toHaveProperty("secretConfig");
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_TEAM_AUTOMATION_CREATED",
      targetType: "AI_TEAM_AUTOMATION"
    }));
  });

  it("rejects active automation without safe business context", async () => {
    await expect(
      aiTeamAutomationService.create("leader-id", {
        name: "Automacao insegura",
        description: "Tentativa de automacao sem contexto de negocio.",
        trigger: {
          type: "MANUAL"
        },
        rule: {
          contextType: "GLOBAL",
          requiredPermission: "OPERATIONAL_CHECKLIST_CREATE"
        },
        action: {
          type: "REGISTER_OPERATION_LOG",
          targetModule: "operations"
        },
        active: true
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Automation with global context requires explicit allowGlobalContext"
    });

    expect(aiTeamAutomationModel.create).not.toHaveBeenCalled();
  });

  it("executes an active automation and records the result", async () => {
    aiTeamAutomationModel.findById.mockResolvedValue(buildAutomation());
    aiTeamAutomationModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const result = await aiTeamAutomationService.execute("operator-id", "automation-id", {
      type: "SCHEDULED",
      reason: "daily-run",
      token: "must-not-leak"
    });

    expect(aiTeamAutomationModel.updateOne).toHaveBeenCalledWith(
      { _id: "automation-id" },
      {
        $push: {
          executions: expect.objectContaining({
            status: "SUCCEEDED",
            triggeredBy: "operator-id",
            triggerPayload: {
              type: "SCHEDULED",
              reason: "daily-run"
            },
            result: expect.objectContaining({
              actionType: "CREATE_OPERATIONAL_CHECKLIST",
              targetModule: "operational-checklists"
            })
          })
        },
        $set: { updatedBy: "operator-id" }
      }
    );
    expect(result.execution.status).toBe("SUCCEEDED");
    expect(result.execution.triggerPayload).not.toHaveProperty("token");
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_TEAM_AUTOMATION_EXECUTED",
      targetId: "automation-id"
    }));
  });

  it("activates and deactivates automations with audit trail", async () => {
    aiTeamAutomationModel.findById.mockResolvedValue(buildAutomation({ active: false }));
    aiTeamAutomationModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const activated = await aiTeamAutomationService.setActive("leader-id", "automation-id", true);

    expect(activated.active).toBe(true);
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_TEAM_AUTOMATION_ACTIVATED"
    }));

    const deactivated = await aiTeamAutomationService.setActive("leader-id", "automation-id", false);

    expect(deactivated.active).toBe(false);
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_TEAM_AUTOMATION_DEACTIVATED"
    }));
  });
});

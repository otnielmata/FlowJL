import { beforeEach, describe, expect, it, vi } from "vitest";

const aiAssistantConversationModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const userModel = {
  findById: vi.fn()
};

const roleModel = {
  findOne: vi.fn()
};

const permissionModel = {
  find: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

const contentProductionServiceMock = {
  create: vi.fn(),
  runAction: vi.fn()
};

const operationalScheduleServiceMock = {
  create: vi.fn()
};

vi.mock("../src/models/ai-assistant-conversation.model.js", () => ({
  AiAssistantConversation: aiAssistantConversationModel,
  aiAssistantQuickActionTypes: ["COPY", "SAVE_AS_CONTENT", "SEND_FOR_APPROVAL", "CREATE_TASK"]
}));
vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/models/user.model.js", () => ({ User: userModel }));
vi.mock("../src/models/role.model.js", () => ({ Role: roleModel }));
vi.mock("../src/models/permission.model.js", () => ({ Permission: permissionModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));
vi.mock("../src/services/content-production.service.js", () => ({ contentProductionService: contentProductionServiceMock }));
vi.mock("../src/services/operational-schedule.service.js", () => ({ operationalScheduleService: operationalScheduleServiceMock }));

const { aiAssistantService } = await import("../src/services/ai-assistant.service.js");

function buildConversation(overrides = {}) {
  return {
    id: "conversation-1",
    title: "Assistente IA | Flow JL",
    context: {
      launchId: "launch-1",
      launchName: "Flow JL 2026",
      product: "Mentoria Premium",
      contentType: "REEL",
      channel: "INSTAGRAM",
      reportType: null,
      workflowStage: "PLANNING",
      objective: "Aumentar leads"
    },
    suggestedPrompts: ["Monte uma resposta alinhada ao lancamento Flow JL 2026."],
    messages: [
      {
        id: "message-user-1",
        role: "USER",
        content: "Monte um roteiro com CTA.",
        attachments: [],
        sources: [],
        availableQuickActions: [],
        generatedArtifacts: [],
        contextSnapshot: {
          launchId: "launch-1",
          launchName: "Flow JL 2026",
          product: "Mentoria Premium",
          contentType: "REEL",
          channel: "INSTAGRAM",
          reportType: null,
          workflowStage: "PLANNING",
          objective: "Aumentar leads"
        },
        humanReviewWarning: null,
        createdAt: new Date("2026-07-13T12:00:00.000Z")
      },
      {
        id: "message-assistant-1",
        role: "ASSISTANT",
        content: "Resposta contextual gerada para lancamento Flow JL 2026, produto Mentoria Premium, formato REEL, canal INSTAGRAM.",
        attachments: [],
        sources: [
          {
            id: "source-1",
            sourceType: "LAUNCH",
            sourceId: "launch-1",
            label: "Flow JL 2026",
            detail: "Produto: Mentoria Premium"
          }
        ],
        availableQuickActions: ["COPY", "SAVE_AS_CONTENT", "SEND_FOR_APPROVAL", "CREATE_TASK"],
        generatedArtifacts: [],
        contextSnapshot: {
          launchId: "launch-1",
          launchName: "Flow JL 2026",
          product: "Mentoria Premium",
          contentType: "REEL",
          channel: "INSTAGRAM",
          reportType: null,
          workflowStage: "PLANNING",
          objective: "Aumentar leads"
        },
        humanReviewWarning: "Conteudo gerado por IA. Revise com validacao humana antes de publicar, aprovar ou executar mudancas operacionais.",
        createdAt: new Date("2026-07-13T12:01:00.000Z")
      }
    ],
    lastInteractionAt: new Date("2026-07-13T12:01:00.000Z"),
    active: true,
    createdAt: new Date("2026-07-13T12:00:00.000Z"),
    updatedAt: new Date("2026-07-13T12:01:00.000Z"),
    createdBy: "user-1",
    updatedBy: "user-1",
    toObject() {
      return { ...this };
    },
    ...overrides
  };
}

function mockSortedFindValue(model, value) {
  model.find.mockReturnValue({
    sort: vi.fn().mockResolvedValue(value)
  });
}

describe("aiAssistantService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      name: "Flow JL 2026",
      product: "Mentoria Premium",
      active: true
    });
    userModel.findById.mockResolvedValue({
      id: "user-1",
      name: "Ana Clara",
      roleId: "role-1",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue({
      id: "role-1",
      permissionIds: ["perm-1", "perm-2", "perm-3"],
      active: true
    });
    permissionModel.find.mockResolvedValue([
      { id: "perm-1", code: "CONTENT_PRODUCTION_CREATE" },
      { id: "perm-2", code: "CONTENT_PRODUCTION_ACTION" },
      { id: "perm-3", code: "OPERATIONAL_SCHEDULE_CREATE" }
    ]);
    auditServiceMock.record.mockResolvedValue(undefined);
    aiAssistantConversationModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("creates a contextual conversation with user message, assistant response, prompts and review warning", async () => {
    aiAssistantConversationModel.create.mockResolvedValue(buildConversation());

    const result = await aiAssistantService.createConversation("user-1", {
      initialPrompt: "Monte um roteiro inicial com CTA.",
      context: {
        launchId: "launch-1",
        contentType: "REEL",
        channel: "INSTAGRAM",
        objective: "Aumentar leads"
      },
      attachments: [{ name: "briefing.pdf", url: "https://files.example/briefing.pdf", mediaType: "application/pdf" }]
    });

    expect(aiAssistantConversationModel.create).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining("Assistente IA"),
      context: expect.objectContaining({
        launchId: "launch-1",
        launchName: "Flow JL 2026",
        product: "Mentoria Premium",
        contentType: "REEL"
      }),
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "USER" }),
        expect.objectContaining({
          role: "ASSISTANT",
          availableQuickActions: expect.arrayContaining(["COPY", "SAVE_AS_CONTENT", "SEND_FOR_APPROVAL", "CREATE_TASK"])
        })
      ])
    }));
    expect(result.messages[1].sources[0].label).toBe("Flow JL 2026");
    expect(result.messages[1].humanReviewWarning).toContain("Revise com validacao humana");
  });

  it("lists conversation summaries with contextual previews", async () => {
    mockSortedFindValue(aiAssistantConversationModel, [buildConversation()]);

    const result = await aiAssistantService.list("user-1", { launchId: "launch-1" });

    expect(aiAssistantConversationModel.find).toHaveBeenCalledWith({
      active: true,
      "context.launchId": "launch-1"
    });
    expect(result[0]).toEqual(expect.objectContaining({
      title: "Assistente IA | Flow JL",
      messageCount: 2,
      lastMessage: expect.objectContaining({
        role: "ASSISTANT"
      })
    }));
  });

  it("sends a new message preserving conversation history and contextual selectors", async () => {
    aiAssistantConversationModel.findById.mockResolvedValue(buildConversation());

    const result = await aiAssistantService.sendMessage("user-1", "conversation-1", {
      content: "Adapte isso para uma etapa de aquecimento.",
      context: {
        workflowStage: "WARMUP"
      },
      attachments: []
    });

    expect(aiAssistantConversationModel.updateOne).toHaveBeenCalledWith(
      { _id: "conversation-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          context: expect.objectContaining({
            workflowStage: "WARMUP"
          }),
          messages: expect.any(Array)
        })
      })
    );
    expect(result.messages).toHaveLength(4);
    expect(result.messages.at(-1).role).toBe("ASSISTANT");
  });

  it("reuses an assistant response as content and sends it for approval", async () => {
    aiAssistantConversationModel.findOne.mockResolvedValue(buildConversation());
    contentProductionServiceMock.create.mockResolvedValue({
      id: "content-1",
      title: "REEL | Resposta contextual",
      status: "DRAFT",
      channel: "INSTAGRAM",
      format: "REEL"
    });
    contentProductionServiceMock.runAction.mockResolvedValue({
      id: "content-1",
      title: "REEL | Resposta contextual",
      status: "IN_REVIEW",
      channel: "INSTAGRAM",
      format: "REEL"
    });

    const result = await aiAssistantService.runQuickAction("user-1", "message-assistant-1", {
      actionType: "SEND_FOR_APPROVAL",
      approverName: "Clara"
    });

    expect(contentProductionServiceMock.create).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        launchId: "launch-1",
        format: "REEL",
        channel: "INSTAGRAM",
        actorName: "Ana Clara"
      })
    );
    expect(contentProductionServiceMock.runAction).toHaveBeenCalledWith(
      "user-1",
      "content-1",
      expect.objectContaining({
        actionType: "SEND_APPROVAL",
        approverName: "Clara",
        actorName: "Ana Clara"
      })
    );
    expect(result.actionResult.content.status).toBe("IN_REVIEW");
    expect(result.generatedArtifact.summary).toContain("enviada para aprovacao");
  });

  it("creates an operational task from an assistant response", async () => {
    aiAssistantConversationModel.findOne.mockResolvedValue(buildConversation());
    permissionModel.find.mockResolvedValue([{ id: "perm-3", code: "OPERATIONAL_SCHEDULE_CREATE" }]);
    operationalScheduleServiceMock.create.mockResolvedValue({
      id: "task-1",
      title: "Acao derivada da IA | REEL | Resposta contextual gerada para lancamento Flow JL 2026, produto Mentoria Premium, formato REEL, canal INSTAGRAM",
      status: "BACKLOG",
      dueAt: new Date("2026-07-15T12:00:00.000Z")
    });

    const result = await aiAssistantService.runQuickAction("user-1", "message-assistant-1", {
      actionType: "CREATE_TASK"
    });

    expect(operationalScheduleServiceMock.create).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        launchId: "launch-1",
        area: "SOCIAL_MEDIA",
        status: "BACKLOG",
        type: "TASK",
        responsible: "Ana Clara"
      })
    );
    expect(result.actionResult.task.id).toBe("task-1");
  });

  it("blocks quick actions when the simulated role does not have the required permission", async () => {
    aiAssistantConversationModel.findOne.mockResolvedValue(buildConversation());
    permissionModel.find.mockResolvedValue([]);

    await expect(
      aiAssistantService.runQuickAction("user-1", "message-assistant-1", {
        actionType: "SAVE_AS_CONTENT"
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Access denied"
    });

    expect(contentProductionServiceMock.create).not.toHaveBeenCalled();
  });
});

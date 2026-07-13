import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const strategyModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn(),
  findOne: vi.fn()
};

const userModel = {
  findById: vi.fn()
};

const offerModel = {
  findOne: vi.fn()
};

const positioningModel = {
  findOne: vi.fn()
};

const editorialLineModel = {
  findOne: vi.fn()
};

const contentPlanModel = {
  findOne: vi.fn()
};

const smartScheduleModel = {
  findOne: vi.fn()
};

const expertApprovalModel = {
  findOne: vi.fn()
};

const auditEventModel = {
  find: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/strategy.model.js", () => ({
  Strategy: strategyModel
}));

vi.mock("../src/models/user.model.js", () => ({
  User: userModel
}));

vi.mock("../src/models/offer.model.js", () => ({
  Offer: offerModel
}));

vi.mock("../src/models/positioning.model.js", () => ({
  Positioning: positioningModel
}));

vi.mock("../src/models/editorial-line.model.js", () => ({
  EditorialLine: editorialLineModel
}));

vi.mock("../src/models/content-plan.model.js", () => ({
  ContentPlan: contentPlanModel
}));

vi.mock("../src/models/smart-schedule.model.js", () => ({
  SmartSchedule: smartScheduleModel
}));

vi.mock("../src/models/expert-approval.model.js", () => ({
  ExpertApproval: expertApprovalModel
}));

vi.mock("../src/models/audit-event.model.js", () => ({
  AuditEvent: auditEventModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { strategyService } = await import("../src/services/strategy.service.js");

function sortedResult(value) {
  return {
    sort: vi.fn().mockResolvedValue(value)
  };
}

function mockEmptyCurrentEntities() {
  offerModel.findOne.mockReturnValue(sortedResult(null));
  positioningModel.findOne.mockReturnValue(sortedResult(null));
  editorialLineModel.findOne.mockReturnValue(sortedResult(null));
  contentPlanModel.findOne.mockReturnValue(sortedResult(null));
  smartScheduleModel.findOne.mockReturnValue(sortedResult(null));
  expertApprovalModel.findOne.mockReturnValue(sortedResult(null));
  auditEventModel.find.mockReturnValue(sortedResult([]));
}

describe("strategyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    userModel.findById.mockResolvedValue({
      id: "user-1",
      name: "Ana Estrategista",
      email: "ana@flowjl.com"
    });
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      name: "Lancamento Meteoro",
      expert: "Expert Flow",
      product: "Produto Meteoro",
      baseDate: new Date("2026-08-01T00:00:00.000Z"),
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-15T00:00:00.000Z"),
      milestones: [],
      active: true,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z")
    });
    mockEmptyCurrentEntities();
  });

  it("creates a strategy with guided draft and calculated progress", async () => {
    const createdStrategy = {
      id: "strategy-1",
      launchId: "launch-1",
      title: "Planejamento Q3",
      product: "Produto Meteoro",
      expert: "Expert Flow",
      responsibleUserId: "user-1",
      status: "IN_PROGRESS",
      completionPercentage: 38,
      pendingChanges: false,
      lastAutoSavedAt: null,
      steps: [
        { key: "overview", label: "Visao geral", status: "COMPLETED", completion: 100, lastSavedAt: null, completedAt: new Date("2026-07-13T12:00:00.000Z") }
      ],
      draft: {
        overview: {
          objective: "Gerar leads",
          briefing: "Briefing principal",
          promise: "Promessa clara",
          launchName: "Lancamento Meteoro",
          product: "Produto Meteoro",
          expert: "Expert Flow"
        },
        persona: {
          segment: "",
          pains: [],
          desires: [],
          objections: []
        },
        offer: {
          productName: "Produto Meteoro",
          transformation: "",
          promise: "",
          benefits: [],
          differentials: []
        },
        positioning: {
          thesis: "",
          centralPromise: "",
          differentiators: []
        },
        editorialLine: {
          pillars: []
        },
        references: [],
        contents: {
          keyFormats: [],
          priorityThemes: [],
          ctas: []
        },
        schedule: {
          timelineSummary: "",
          deliveryCadence: "",
          checkpoints: []
        }
      },
      references: [],
      comments: [],
      history: [],
      approval: {
        status: "NOT_SUBMITTED",
        submittedAt: null,
        submittedBy: null,
        decidedAt: null,
        decidedBy: null
      },
      active: true,
      createdAt: new Date("2026-07-13T12:00:00.000Z"),
      updatedAt: new Date("2026-07-13T12:00:00.000Z")
    };
    strategyModel.create.mockResolvedValue(createdStrategy);
    strategyModel.findById.mockResolvedValue(createdStrategy);

    const created = await strategyService.create("user-1", {
      launchId: "launch-1",
      title: "Planejamento Q3",
      draft: {
        overview: {
          objective: "Gerar leads",
          briefing: "Briefing principal",
          promise: "Promessa clara"
        }
      }
    });

    expect(strategyModel.create).toHaveBeenCalledWith(expect.objectContaining({
      launchId: "launch-1",
      title: "Planejamento Q3",
      responsibleUserId: "user-1"
    }));
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "STRATEGY_CREATED",
      targetType: "STRATEGY"
    }));
    expect(created.title).toBe("Planejamento Q3");
  });

  it("lists strategies with filters, launch context and progress", async () => {
    strategyModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "strategy-1",
          title: "Planejamento Meteoro",
          status: "IN_PROGRESS",
          completionPercentage: 63,
          pendingChanges: false,
          responsibleUserId: "user-1",
          launchId: "launch-1",
          createdAt: new Date("2026-07-13T10:00:00.000Z"),
          updatedAt: new Date("2026-07-13T11:00:00.000Z")
        }
      ])
    });

    const result = await strategyService.list({
      status: "IN_PROGRESS",
      search: "Meteoro"
    });

    expect(result).toHaveLength(1);
    expect(result[0].launch.name).toBe("Lancamento Meteoro");
    expect(result[0].completionPercentage).toBe(63);
  });

  it("saves a draft step with auto-save feedback and recomputed progress", async () => {
    strategyModel.findById.mockResolvedValue({
      id: "strategy-1",
      launchId: "launch-1",
      status: "IN_PROGRESS",
      approval: {
        status: "NOT_SUBMITTED"
      },
      completionPercentage: 13,
      archivedAt: null,
      references: [],
      steps: [
        { key: "overview", label: "Visao geral", status: "COMPLETED", completion: 100, lastSavedAt: null, completedAt: new Date("2026-07-13T12:00:00.000Z") },
        { key: "persona", label: "Persona", status: "PENDING", completion: 0, lastSavedAt: null, completedAt: null },
        { key: "offer", label: "Oferta", status: "PENDING", completion: 0, lastSavedAt: null, completedAt: null },
        { key: "positioning", label: "Posicionamento", status: "PENDING", completion: 0, lastSavedAt: null, completedAt: null },
        { key: "editorialLine", label: "Linha editorial", status: "PENDING", completion: 0, lastSavedAt: null, completedAt: null },
        { key: "references", label: "Referencias", status: "PENDING", completion: 0, lastSavedAt: null, completedAt: null },
        { key: "contents", label: "Conteudos", status: "PENDING", completion: 0, lastSavedAt: null, completedAt: null },
        { key: "schedule", label: "Cronograma", status: "PENDING", completion: 0, lastSavedAt: null, completedAt: null }
      ],
      draft: {
        overview: {
          objective: "Gerar leads",
          briefing: "Briefing principal"
        },
        persona: {
          segment: "",
          pains: [],
          desires: [],
          objections: []
        },
        offer: {},
        positioning: {},
        editorialLine: {
          pillars: []
        },
        references: [],
        contents: {
          keyFormats: [],
          priorityThemes: [],
          ctas: []
        },
        schedule: {
          timelineSummary: "",
          deliveryCadence: "",
          checkpoints: []
        }
      },
      history: []
    });

    const result = await strategyService.saveDraft("user-1", "strategy-1", {
      stepKey: "persona",
      saveMode: "AUTO",
      data: {
        segment: "Infoprodutores em escalada",
        pains: ["Baixa conversao"],
        desires: ["Mais previsibilidade"],
        objections: ["Tempo curto"]
      }
    });

    expect(strategyModel.updateOne).toHaveBeenCalledWith(
      { _id: "strategy-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          completionPercentage: expect.any(Number),
          lastAutoSavedAt: expect.any(Date)
        })
      })
    );
    expect(result.feedback.type).toBe("AUTO_SAVE");
    expect(result.completionPercentage).toBe(25);
  });

  it("returns the strategy detail with tabs, comments and actions", async () => {
    strategyModel.findById.mockResolvedValue({
      id: "strategy-1",
      launchId: "launch-1",
      title: "Planejamento Meteoro",
      product: "Produto Meteoro",
      expert: "Expert Flow",
      responsibleUserId: "user-1",
      status: "READY_FOR_APPROVAL",
      completionPercentage: 100,
      pendingChanges: false,
      lastAutoSavedAt: null,
      steps: [
        { key: "overview", label: "Visao geral", status: "COMPLETED", completion: 100, lastSavedAt: new Date("2026-07-13T12:00:00.000Z"), completedAt: new Date("2026-07-13T12:00:00.000Z") }
      ],
      draft: {
        overview: {
          objective: "Gerar leads",
          briefing: "Briefing principal"
        },
        persona: {
          segment: "Infoprodutores"
        },
        offer: {
          transformation: "Escala"
        },
        positioning: {
          thesis: "Autoridade"
        },
        editorialLine: {
          pillars: [{ name: "Bastidores", angle: "Prova", active: true }]
        },
        references: [],
        contents: {
          keyFormats: ["Reel"],
          priorityThemes: ["Bastidores"],
          ctas: ["Entrar na lista"]
        },
        schedule: {
          timelineSummary: "8 semanas",
          deliveryCadence: "Diaria",
          checkpoints: ["Checkpoint 1"]
        }
      },
      references: [
        {
          id: "ref-1",
          title: "Benchmark",
          type: "BENCHMARK",
          url: "https://example.com",
          notes: "Referencia-chave"
        }
      ],
      comments: [
        {
          id: "comment-1",
          authorUserId: "user-1",
          message: "Precisamos revisar a promessa",
          createdAt: new Date("2026-07-13T12:30:00.000Z")
        }
      ],
      history: [
        {
          id: "history-1",
          action: "STRATEGY_CREATED",
          description: "Criada",
          actorUserId: "user-1",
          metadata: {},
          occurredAt: new Date("2026-07-13T12:00:00.000Z")
        }
      ],
      approval: {
        status: "NOT_SUBMITTED",
        submittedAt: null,
        submittedBy: null,
        decidedAt: null,
        decidedBy: null
      },
      createdAt: new Date("2026-07-13T12:00:00.000Z"),
      updatedAt: new Date("2026-07-13T12:40:00.000Z")
    });
    auditEventModel.find.mockReturnValue(sortedResult([
      {
        id: "audit-1",
        action: "STRATEGY_DRAFT_SAVED",
        actorUserId: "user-1",
        context: { stepKey: "persona" },
        occurredAt: new Date("2026-07-13T12:20:00.000Z")
      }
    ]));

    const result = await strategyService.getById("strategy-1", { code: "DIGITAL_STRATEGIST" });

    expect(result.tabs.references[0].title).toBe("Benchmark");
    expect(result.tabs.comments[0].author.name).toBe("Ana Estrategista");
    expect(result.actions.canSubmitForApproval).toBe(true);
  });

  it("submits the strategy for approval when it is sufficiently complete", async () => {
    strategyModel.findById.mockResolvedValue({
      id: "strategy-1",
      completionPercentage: 88,
      status: "READY_FOR_APPROVAL",
      approval: {
        status: "NOT_SUBMITTED"
      },
      archivedAt: null,
      history: []
    });

    const result = await strategyService.submitForApproval("user-1", "strategy-1");

    expect(strategyModel.updateOne).toHaveBeenCalledWith(
      { _id: "strategy-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "IN_REVIEW"
        })
      })
    );
    expect(result.status).toBe("IN_REVIEW");
  });

  it("archives a strategy and returns AI content suggestions", async () => {
    strategyModel.findById
      .mockResolvedValueOnce({
        id: "strategy-1",
        status: "IN_PROGRESS",
        history: []
      })
      .mockResolvedValueOnce({
        id: "strategy-1",
        draft: {
          persona: {
            segment: "Infoprodutores"
          },
          offer: {
            promise: "Escalar com previsibilidade"
          },
          positioning: {
            thesis: "Posicionamento premium"
          },
          contents: {
            keyFormats: ["Reel", "Carrossel"]
          }
        },
        product: "Produto Meteoro",
        title: "Planejamento Meteoro"
      });

    const archived = await strategyService.archive("user-1", "strategy-1");
    const aiContent = await strategyService.generateAiContent("strategy-1");

    expect(archived.status).toBe("ARCHIVED");
    expect(aiContent.suggestions).toHaveLength(2);
  });
});

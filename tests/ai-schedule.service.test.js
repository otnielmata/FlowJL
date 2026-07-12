import { beforeEach, describe, expect, it, vi } from "vitest";

const aiScheduleModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn()
};

const launchModel = { findById: vi.fn() };
const contentPlanModel = { findOne: vi.fn() };
const smartScheduleModel = { findOne: vi.fn() };
const classScheduleModel = { find: vi.fn() };
const liveEventModel = { find: vi.fn() };
const operationalChecklistModel = { find: vi.fn() };
const supportTicketModel = { find: vi.fn() };
const auditServiceMock = { record: vi.fn() };
const aiScheduleGeneratorServiceMock = { generate: vi.fn() };

vi.mock("../src/models/ai-schedule.model.js", () => ({
  AiSchedule: aiScheduleModel,
  aiScheduleReviewStatuses: ["PENDING_REVIEW", "APPROVED", "REJECTED"]
}));
vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/models/content-plan.model.js", () => ({ ContentPlan: contentPlanModel }));
vi.mock("../src/models/smart-schedule.model.js", () => ({ SmartSchedule: smartScheduleModel }));
vi.mock("../src/models/class-schedule.model.js", () => ({ ClassSchedule: classScheduleModel }));
vi.mock("../src/models/live-event.model.js", () => ({ LiveEvent: liveEventModel }));
vi.mock("../src/models/operational-checklist.model.js", () => ({ OperationalChecklist: operationalChecklistModel }));
vi.mock("../src/models/support-ticket.model.js", () => ({ SupportTicket: supportTicketModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));
vi.mock("../src/services/ai-schedule-generator.service.js", () => ({ aiScheduleGeneratorService: aiScheduleGeneratorServiceMock }));

const { aiScheduleService } = await import("../src/services/ai-schedule.service.js");

function queryMock(value) {
  return {
    sort: vi.fn().mockResolvedValue(value)
  };
}

function buildLaunch(overrides = {}) {
  return {
    id: "launch-id",
    name: "Lancamento Premium",
    expert: "Ana Costa",
    product: "Programa Escala Digital",
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-30T23:59:59.000Z"),
    milestones: [
      { name: "Abertura", scheduledAt: new Date("2026-08-10T12:00:00.000Z") },
      { name: "Carrinho", scheduledAt: new Date("2026-08-20T12:00:00.000Z") }
    ],
    active: true,
    ...overrides
  };
}

function buildSchedule(overrides = {}) {
  return {
    id: "schedule-id",
    launchId: "launch-id",
    objective: "Planejar lancamento completo",
    briefing: "Briefing completo com contexto operacional suficiente para gerar cronograma.",
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-30T23:59:59.000Z"),
    phases: [
      {
        name: "Preparacao",
        objective: "Organizar estrategia",
        startsAt: new Date("2026-08-01T00:00:00.000Z"),
        endsAt: new Date("2026-08-10T00:00:00.000Z"),
        activities: [
          {
            id: "activity-id",
            title: "Consolidar briefing",
            stage: "Preparacao",
            area: "Estrategia",
            suggestedResponsibleRole: "DIGITAL_STRATEGIST",
            dueAt: new Date("2026-08-02T00:00:00.000Z"),
            dependencies: [],
            reviewNotes: ["Revisar com humano"]
          }
        ]
      }
    ],
    reviewNotes: ["Revisao humana obrigatoria"],
    sourceContext: {
      launchId: "launch-id",
      launchName: "Lancamento Premium",
      product: "Programa Escala Digital",
      expert: "Ana Costa",
      contentPlanVersion: 2,
      smartScheduleVersion: 1,
      internalSignals: {
        milestonesCount: 2,
        contentPlanItemsCount: 3,
        smartScheduleActivitiesCount: 2,
        classSchedulesCount: 1,
        liveEventsCount: 1,
        operationalChecklistsCount: 1,
        supportTicketsCount: 1
      }
    },
    generatedByAI: true,
    humanReviewRequired: true,
    reviewStatus: "PENDING_REVIEW",
    active: true,
    createdAt: new Date("2026-07-12T12:00:00.000Z"),
    updatedAt: new Date("2026-07-12T12:00:00.000Z"),
    createdBy: "strategist-id",
    updatedBy: "strategist-id",
    ...overrides
  };
}

describe("aiScheduleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    launchModel.findById.mockResolvedValue(buildLaunch());
    contentPlanModel.findOne.mockReturnValue(queryMock({
      version: 2,
      items: [{ theme: "Autoridade", active: true }, { theme: "Oferta", active: true }]
    }));
    smartScheduleModel.findOne.mockReturnValue(queryMock({
      version: 1,
      activities: [{ theme: "Live de aquecimento" }, { theme: "Disparo de oferta" }]
    }));
    classScheduleModel.find.mockResolvedValue([{}]);
    liveEventModel.find.mockResolvedValue([{}]);
    operationalChecklistModel.find.mockResolvedValue([{}]);
    supportTicketModel.find.mockResolvedValue([{}]);
  });

  it("generates a structured AI schedule with safe context metadata and audit trail", async () => {
    aiScheduleGeneratorServiceMock.generate.mockReturnValue({
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-30T23:59:59.000Z"),
      phases: buildSchedule().phases,
      reviewNotes: ["Revisao humana obrigatoria"]
    });

    const result = await aiScheduleService.generate("strategist-id", "launch-id", {
      objective: "Planejar lancamento completo",
      briefing: "Briefing completo com contexto operacional suficiente para gerar cronograma."
    });

    expect(aiScheduleGeneratorServiceMock.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        launch: expect.objectContaining({ id: "launch-id" }),
        objective: "Planejar lancamento completo",
        sourceContext: expect.objectContaining({
          launchId: "launch-id",
          contentPlanVersion: 2,
          smartScheduleVersion: 1,
          internalSignals: expect.objectContaining({
            milestonesCount: 2,
            contentPlanItemsCount: 2,
            supportTicketsCount: 1
          })
        })
      })
    );
    expect(result).not.toHaveProperty("prompt");
    expect(result.humanReviewRequired).toBe(true);
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "AI_SCHEDULE_GENERATED",
      targetType: "LAUNCH",
      targetId: "launch-id",
      context: {
        launchId: "launch-id",
        objective: "Planejar lancamento completo",
        contentPlanVersion: 2,
        smartScheduleVersion: 1
      }
    });
  });

  it("rejects generation without minimum launch context", async () => {
    launchModel.findById.mockResolvedValue(buildLaunch({ milestones: [] }));
    contentPlanModel.findOne.mockReturnValue(queryMock(null));
    smartScheduleModel.findOne.mockReturnValue(queryMock(null));

    await expect(
      aiScheduleService.generate("strategist-id", "launch-id", {
        objective: "Planejar lancamento completo",
        briefing: "Briefing completo com contexto operacional suficiente para gerar cronograma."
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "AI schedule generation requires launch briefing and minimum operational context"
    });
  });

  it("persists generated AI schedule for human review", async () => {
    aiScheduleModel.create.mockResolvedValue(buildSchedule());

    const result = await aiScheduleService.create("strategist-id", buildSchedule());

    expect(aiScheduleModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-id",
        objective: "Planejar lancamento completo",
        generatedByAI: true,
        humanReviewRequired: true,
        reviewStatus: "PENDING_REVIEW",
        active: true,
        createdBy: "strategist-id",
        updatedBy: "strategist-id"
      })
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "AI_SCHEDULE_SAVED",
      targetType: "AI_SCHEDULE",
      targetId: "schedule-id",
      context: {
        launchId: "launch-id",
        reviewStatus: "PENDING_REVIEW",
        contentPlanVersion: 2,
        smartScheduleVersion: 1
      }
    });
    expect(result.reviewStatus).toBe("PENDING_REVIEW");
  });

  it("lists and retrieves saved AI schedules", async () => {
    aiScheduleModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildSchedule()])
    });
    aiScheduleModel.findById.mockResolvedValue(buildSchedule());

    const listResult = await aiScheduleService.list({ launchId: "launch-id", reviewStatus: "PENDING_REVIEW" });
    const getResult = await aiScheduleService.getById("schedule-id");

    expect(aiScheduleModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      reviewStatus: "PENDING_REVIEW",
      active: true
    });
    expect(listResult).toHaveLength(1);
    expect(getResult.id).toBe("schedule-id");
  });
});

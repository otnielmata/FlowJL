import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const contentPlanModel = {
  findOne: vi.fn()
};

const smartScheduleModel = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/content-plan.model.js", () => ({
  ContentPlan: contentPlanModel
}));

vi.mock("../src/models/smart-schedule.model.js", () => ({
  SmartSchedule: smartScheduleModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { smartScheduleService } = await import("../src/services/smart-schedule.service.js");

describe("smartScheduleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("generates the current smart schedule from content plan and launch milestones", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      milestones: [
        { name: "Aquecimento", scheduledAt: new Date("2026-08-01T12:00:00.000Z") },
        { name: "Carrinho", scheduledAt: new Date("2026-08-05T12:00:00.000Z") }
      ]
    });
    smartScheduleModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue(null)
    });
    contentPlanModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        version: 2,
        items: [
          {
            theme: "Tema 1",
            format: "Reel",
            objective: "Autoridade",
            cta: "Comentar",
            stage: "Aquecimento",
            periodLabel: "Semana 1",
            active: true
          }
        ]
      })
    });
    smartScheduleModel.create.mockResolvedValue({
      id: "schedule-id",
      launchId: "launch-id",
      version: 1,
      objective: "Autoridade",
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-10T00:00:00.000Z"),
      operationalCadenceDays: 2,
      contentPlanVersion: 2,
      activities: [
        {
          id: "activity-1",
          theme: "Tema 1",
          objective: "Autoridade",
          stage: "Aquecimento",
          deliveryType: "Reel",
          area: "Social Media",
          suggestedResponsibleRole: "SOCIAL_MEDIA",
          dueAt: new Date("2026-08-01T12:00:00.000Z"),
          status: "PLANNED"
        }
      ],
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T23:00:00.000Z"),
      updatedAt: new Date("2026-07-11T23:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await smartScheduleService.create("strategist-id", "launch-id", {
      objective: "Autoridade",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-10T00:00:00.000Z",
      operationalCadenceDays: 2
    });

    expect(smartScheduleModel.create).toHaveBeenCalledWith(expect.objectContaining({
      launchId: "launch-id",
      version: 1,
      contentPlanVersion: 2
    }));
    expect(result.grouped.byStage[0].stage).toBe("Aquecimento");
  });

  it("updates the smart schedule preserving history", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    smartScheduleModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue({
        id: "schedule-v1",
        version: 1,
        createdBy: "strategist-id"
      })
    });
    contentPlanModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 3 })
    });
    smartScheduleModel.updateOne.mockResolvedValue(undefined);
    smartScheduleModel.create.mockResolvedValue({
      id: "schedule-v2",
      launchId: "launch-id",
      version: 2,
      objective: "Conversao",
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-10T00:00:00.000Z"),
      operationalCadenceDays: 2,
      contentPlanVersion: 3,
      activities: [
        {
          id: "activity-2",
          theme: "Tema 2",
          objective: "Conversao",
          stage: "Lancamento",
          deliveryType: "Carrossel",
          area: "Social Media",
          suggestedResponsibleRole: "SOCIAL_MEDIA",
          dueAt: new Date("2026-08-03T12:00:00.000Z"),
          status: "IN_PROGRESS"
        }
      ],
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T23:10:00.000Z"),
      updatedAt: new Date("2026-07-11T23:10:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await smartScheduleService.update("strategist-id", "launch-id", {
      objective: "Conversao",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-10T00:00:00.000Z",
      operationalCadenceDays: 2,
      activities: [
        {
          theme: "Tema 2",
          objective: "Conversao",
          stage: "Lancamento",
          deliveryType: "Carrossel",
          area: "Social Media",
          suggestedResponsibleRole: "SOCIAL_MEDIA",
          dueAt: "2026-08-03T12:00:00.000Z",
          status: "IN_PROGRESS"
        }
      ]
    });

    expect(smartScheduleModel.updateOne).toHaveBeenCalledWith(
      { _id: "schedule-v1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          isCurrent: false,
          active: false
        })
      })
    );
    expect(result.version).toBe(2);
  });

  it("rejects creation when no content plan exists", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    smartScheduleModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue(null)
    });
    contentPlanModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(null)
    });

    await expect(
      smartScheduleService.create("strategist-id", "launch-id", {
        objective: "Autoridade",
        periodStart: "2026-08-01T00:00:00.000Z",
        periodEnd: "2026-08-10T00:00:00.000Z",
        operationalCadenceDays: 2
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Smart schedule requires a content plan"
    });
  });
});

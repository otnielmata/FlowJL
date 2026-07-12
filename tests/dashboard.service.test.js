import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  find: vi.fn(),
  findById: vi.fn()
};

const marketResearchModel = {
  findOne: vi.fn()
};

const competitorResearchModel = {
  find: vi.fn()
};

const avatarModel = {
  findOne: vi.fn()
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

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/market-research.model.js", () => ({
  MarketResearch: marketResearchModel
}));

vi.mock("../src/models/competitor-research.model.js", () => ({
  CompetitorResearch: competitorResearchModel
}));

vi.mock("../src/models/avatar.model.js", () => ({
  Avatar: avatarModel
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

const { dashboardService } = await import("../src/services/dashboard.service.js");

function mockSortedFindOne(model, value) {
  model.findOne.mockReturnValue({
    sort: vi.fn().mockResolvedValue(value)
  });
}

describe("dashboardService.getStrategistDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T15:00:00.000Z"));

    mockSortedFindOne(marketResearchModel, {
      id: "research-v1",
      version: 1,
      updatedAt: new Date("2026-07-11T11:00:00.000Z"),
      createdAt: new Date("2026-07-11T11:00:00.000Z")
    });
    competitorResearchModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "competitor-1",
          updatedAt: new Date("2026-07-11T11:30:00.000Z"),
          createdAt: new Date("2026-07-11T11:30:00.000Z")
        }
      ])
    });
    mockSortedFindOne(avatarModel, {
      id: "avatar-v2",
      version: 2,
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdAt: new Date("2026-07-11T12:00:00.000Z")
    });
    mockSortedFindOne(offerModel, {
      id: "offer-v2",
      version: 2,
      updatedAt: new Date("2026-07-11T12:10:00.000Z"),
      createdAt: new Date("2026-07-11T12:10:00.000Z")
    });
    mockSortedFindOne(positioningModel, {
      id: "positioning-v2",
      version: 2,
      updatedAt: new Date("2026-07-11T12:20:00.000Z"),
      createdAt: new Date("2026-07-11T12:20:00.000Z")
    });
    mockSortedFindOne(editorialLineModel, {
      id: "editorial-v2",
      version: 2,
      updatedAt: new Date("2026-07-11T12:30:00.000Z"),
      createdAt: new Date("2026-07-11T12:30:00.000Z")
    });
    mockSortedFindOne(contentPlanModel, {
      id: "content-plan-v2",
      version: 2,
      updatedAt: new Date("2026-07-11T12:40:00.000Z"),
      createdAt: new Date("2026-07-11T12:40:00.000Z")
    });
    mockSortedFindOne(smartScheduleModel, {
      id: "schedule-v2",
      version: 2,
      updatedAt: new Date("2026-07-11T12:50:00.000Z"),
      createdAt: new Date("2026-07-11T12:50:00.000Z"),
      activities: [
        {
          id: "activity-1",
          stage: "Aquecimento",
          dueAt: "2026-07-10T12:00:00.000Z",
          status: "PLANNED"
        },
        {
          id: "activity-2",
          stage: "Aquecimento",
          dueAt: "2026-07-12T12:00:00.000Z",
          status: "DONE"
        },
        {
          id: "activity-3",
          stage: "Carrinho",
          dueAt: "2026-07-13T12:00:00.000Z",
          status: "PLANNED"
        }
      ]
    });
    mockSortedFindOne(expertApprovalModel, {
      id: "approval-v2",
      version: 2,
      status: "IN_REVIEW",
      updatedAt: new Date("2026-07-11T13:00:00.000Z"),
      createdAt: new Date("2026-07-11T13:00:00.000Z")
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns consolidated indicators for a specific launch", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Expert X",
      expert: "Expert X",
      product: "Produto Y",
      baseDate: new Date("2026-08-01T00:00:00.000Z"),
      periodStart: new Date("2026-08-05T00:00:00.000Z"),
      periodEnd: new Date("2026-08-20T00:00:00.000Z"),
      updatedAt: new Date("2026-07-11T10:00:00.000Z"),
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
      active: true
    });

    const result = await dashboardService.getStrategistDashboard({
      launchId: "launch-id"
    });

    expect(launchModel.findById).toHaveBeenCalledWith("launch-id");
    expect(result.filters).toEqual({
      launchId: "launch-id"
    });
    expect(result.summary.totalLaunches).toBe(1);
    expect(result.summary.launchesInReview).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        progressPercentage: 89,
        pendingCount: 3,
        delayedCount: 1,
        approvalStatus: "IN_REVIEW",
        metrics: {
          totalSteps: 9,
          completedSteps: 8,
          totalActivities: 3,
          completedActivities: 1,
          pendingActivities: 2,
          delayedActivities: 1
        }
      })
    );
    expect(result.items[0].strategySteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "marketResearch", status: "COMPLETED", version: 1 }),
        expect.objectContaining({ key: "expertApproval", status: "IN_REVIEW", version: 2 })
      ])
    );
    expect(result.items[0].stageStatus).toEqual([
      {
        stage: "Aquecimento",
        status: "DELAYED",
        totalActivities: 2,
        completedActivities: 1,
        pendingActivities: 1,
        delayedActivities: 1,
        progressPercentage: 50,
        nextDueAt: new Date("2026-07-12T12:00:00.000Z"),
        lastDueAt: new Date("2026-07-12T12:00:00.000Z")
      },
      {
        stage: "Carrinho",
        status: "PENDING",
        totalActivities: 1,
        completedActivities: 0,
        pendingActivities: 1,
        delayedActivities: 0,
        progressPercentage: 0,
        nextDueAt: new Date("2026-07-13T12:00:00.000Z"),
        lastDueAt: new Date("2026-07-13T12:00:00.000Z")
      }
    ]);
  });

  it("returns all active launches when no filter is informed", async () => {
    launchModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "launch-1",
          name: "Launch 1",
          expert: "Expert 1",
          product: "Produto 1",
          baseDate: new Date("2026-08-01T00:00:00.000Z"),
          periodStart: new Date("2026-08-05T00:00:00.000Z"),
          periodEnd: new Date("2026-08-20T00:00:00.000Z"),
          updatedAt: new Date("2026-07-11T10:00:00.000Z"),
          createdAt: new Date("2026-07-11T10:00:00.000Z"),
          active: true
        },
        {
          id: "launch-2",
          name: "Launch 2",
          expert: "Expert 2",
          product: "Produto 2",
          baseDate: new Date("2026-09-01T00:00:00.000Z"),
          periodStart: new Date("2026-09-05T00:00:00.000Z"),
          periodEnd: new Date("2026-09-20T00:00:00.000Z"),
          updatedAt: new Date("2026-07-11T09:00:00.000Z"),
          createdAt: new Date("2026-07-11T09:00:00.000Z"),
          active: true
        }
      ])
    });

    const result = await dashboardService.getStrategistDashboard();

    expect(launchModel.find).toHaveBeenCalledWith({ active: true });
    expect(result.filters).toEqual({
      launchId: null
    });
    expect(result.summary.totalLaunches).toBe(2);
    expect(result.items).toHaveLength(2);
  });

  it("rejects an unknown launch filter", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      dashboardService.getStrategistDashboard({
        launchId: "launch-missing"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });
});

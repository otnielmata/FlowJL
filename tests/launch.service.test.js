import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findOne: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  find: vi.fn()
};

const userModel = {
  findById: vi.fn()
};

const marketResearchModel = {
  find: vi.fn()
};

const competitorResearchModel = {
  find: vi.fn()
};

const avatarModel = {
  find: vi.fn()
};

const offerModel = {
  find: vi.fn()
};

const positioningModel = {
  find: vi.fn()
};

const editorialLineModel = {
  find: vi.fn()
};

const contentPlanModel = {
  find: vi.fn()
};

const smartScheduleModel = {
  find: vi.fn()
};

const expertApprovalModel = {
  find: vi.fn(),
  findOne: vi.fn()
};

const strategyModel = {
  find: vi.fn()
};

const trafficCampaignModel = {
  find: vi.fn()
};

const contentApprovalModel = {
  find: vi.fn()
};

const assetLibraryModel = {
  find: vi.fn()
};

const auditEventModel = {
  find: vi.fn()
};

const reelModel = {
  find: vi.fn()
};

const carouselModel = {
  find: vi.fn()
};

const storySequenceModel = {
  find: vi.fn()
};

const emailCampaignModel = {
  find: vi.fn()
};

const youtubeContentModel = {
  find: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/user.model.js", () => ({
  User: userModel
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

vi.mock("../src/models/strategy.model.js", () => ({
  Strategy: strategyModel
}));

vi.mock("../src/models/traffic-campaign.model.js", () => ({
  TrafficCampaign: trafficCampaignModel
}));

vi.mock("../src/models/content-approval.model.js", () => ({
  ContentApproval: contentApprovalModel
}));

vi.mock("../src/models/asset-library-item.model.js", () => ({
  AssetLibraryItem: assetLibraryModel
}));

vi.mock("../src/models/audit-event.model.js", () => ({
  AuditEvent: auditEventModel
}));

vi.mock("../src/models/reel.model.js", () => ({
  Reel: reelModel
}));

vi.mock("../src/models/carousel.model.js", () => ({
  Carousel: carouselModel
}));

vi.mock("../src/models/story-sequence.model.js", () => ({
  StorySequence: storySequenceModel
}));

vi.mock("../src/models/email-campaign.model.js", () => ({
  EmailCampaign: emailCampaignModel
}));

vi.mock("../src/models/youtube-content.model.js", () => ({
  YouTubeContent: youtubeContentModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { launchService } = await import("../src/services/launch.service.js");

function sortedResult(value) {
  return {
    sort: vi.fn().mockResolvedValue(value)
  };
}

describe("launchService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    userModel.findById.mockResolvedValue({
      id: "user-1",
      name: "Ana Gestora",
      email: "ana@flowjl.com"
    });
    marketResearchModel.find.mockReturnValue(sortedResult([]));
    competitorResearchModel.find.mockReturnValue(sortedResult([]));
    avatarModel.find.mockReturnValue(sortedResult([]));
    offerModel.find.mockReturnValue(sortedResult([]));
    positioningModel.find.mockReturnValue(sortedResult([]));
    editorialLineModel.find.mockReturnValue(sortedResult([]));
    contentPlanModel.find.mockReturnValue(sortedResult([]));
    smartScheduleModel.find.mockReturnValue(sortedResult([]));
    expertApprovalModel.find.mockReturnValue(sortedResult([]));
    expertApprovalModel.findOne.mockReturnValue(sortedResult(null));
    strategyModel.find.mockReturnValue(sortedResult([]));
    trafficCampaignModel.find.mockReturnValue(sortedResult([]));
    contentApprovalModel.find.mockReturnValue(sortedResult([]));
    assetLibraryModel.find.mockReturnValue(sortedResult([]));
    auditEventModel.find.mockReturnValue(sortedResult([]));
    reelModel.find.mockReturnValue(sortedResult([]));
    carouselModel.find.mockReturnValue(sortedResult([]));
    storySequenceModel.find.mockReturnValue(sortedResult([]));
    emailCampaignModel.find.mockReturnValue(sortedResult([]));
    youtubeContentModel.find.mockReturnValue(sortedResult([]));
  });

  it("creates a launch with goals, responsible and coherent phase dates", async () => {
    launchModel.findOne.mockResolvedValue(null);
    launchModel.create.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Expert X",
      expert: "Expert X",
      product: "Produto Y",
      responsibleUserId: "user-1",
      status: "PLANNING",
      baseDate: new Date("2026-08-01T00:00:00.000Z"),
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-20T15:30:00.000Z"),
      phaseDates: {
        warmupStart: new Date("2026-08-01T00:00:00.000Z"),
        cpl1At: new Date("2026-08-05T12:00:00.000Z"),
        cpl2At: new Date("2026-08-10T12:00:00.000Z"),
        cpl3At: null,
        cartOpenAt: new Date("2026-08-15T12:00:00.000Z"),
        cartCloseAt: new Date("2026-08-20T15:30:00.000Z"),
        deliveryAt: null
      },
      goals: {
        leadTarget: 1000,
        salesTarget: 80,
        revenueTarget: 24000
      },
      milestones: [
        { name: "Aquecimento", scheduledAt: new Date("2026-08-05T12:00:00.000Z") },
        { name: "Carrinho", scheduledAt: new Date("2026-08-20T15:30:00.000Z") }
      ],
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "user-1",
      updatedBy: "user-1"
    });

    const result = await launchService.create("user-1", {
      name: " Lancamento Expert X ",
      expert: " Expert X ",
      product: " Produto Y ",
      responsibleUserId: "user-1",
      status: "PLANNING",
      baseDate: "2026-08-01T00:00:00.000Z",
      phaseDates: {
        warmupStart: "2026-08-01T00:00:00.000Z",
        cpl1At: "2026-08-05T12:00:00.000Z",
        cpl2At: "2026-08-10T12:00:00.000Z",
        cartOpenAt: "2026-08-15T12:00:00.000Z",
        cartCloseAt: "2026-08-20T15:30:00.000Z"
      },
      goals: {
        leadTarget: 1000,
        salesTarget: 80,
        revenueTarget: 24000
      },
      milestones: [
        { name: " Aquecimento ", scheduledAt: "2026-08-05T12:00:00.000Z" },
        { name: " Carrinho ", scheduledAt: "2026-08-20T15:30:00.000Z" }
      ]
    });

    expect(launchModel.create).toHaveBeenCalledWith(expect.objectContaining({
      responsibleUserId: "user-1",
      status: "PLANNING",
      goals: {
        leadTarget: 1000,
        salesTarget: 80,
        revenueTarget: 24000
      }
    }));
    expect(result.phaseDates.cartOpenAt).toEqual(new Date("2026-08-15T12:00:00.000Z"));
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "LAUNCH_CREATED",
      targetType: "LAUNCH"
    }));
  });

  it("rejects non-chronological launch phases", async () => {
    await expect(
      launchService.create("user-1", {
        name: "Lancamento X",
        expert: "Expert X",
        product: "Produto Y",
        baseDate: "2026-08-01T00:00:00.000Z",
        phaseDates: {
          cartCloseAt: "2026-08-10T00:00:00.000Z",
          cartOpenAt: "2026-08-12T00:00:00.000Z"
        },
        milestones: [{ name: "Marco", scheduledAt: "2026-08-05T12:00:00.000Z" }]
      })
    ).rejects.toMatchObject({
      statusCode: 400
    });
  });

  it("lists launches for table and cards with progress and responsible", async () => {
    launchModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "launch-id",
          name: "Lancamento Expert X",
          expert: "Expert X",
          product: "Produto Y",
          responsibleUserId: "user-1",
          status: "WARMUP",
          baseDate: new Date("2026-08-01T00:00:00.000Z"),
          periodStart: new Date("2026-08-01T00:00:00.000Z"),
          periodEnd: new Date("2026-08-20T00:00:00.000Z"),
          phaseDates: {
            warmupStart: new Date("2026-08-01T00:00:00.000Z"),
            cartOpenAt: new Date("2026-08-15T00:00:00.000Z"),
            cartCloseAt: new Date("2026-08-20T00:00:00.000Z")
          },
          goals: {},
          milestones: [],
          active: true,
          createdAt: new Date("2026-07-10T00:00:00.000Z"),
          updatedAt: new Date("2026-07-11T00:00:00.000Z")
        }
      ])
    });
    strategyModel.find.mockReturnValue(sortedResult([
      { status: "APPROVED", completionPercentage: 100 }
    ]));
    trafficCampaignModel.find.mockReturnValue(sortedResult([
      { status: "ACTIVE", budget: 1200 }
    ]));
    expertApprovalModel.findOne.mockReturnValue(sortedResult({
      status: "APPROVED"
    }));

    const result = await launchService.list({ search: "Expert" });

    expect(result.summary.total).toBe(1);
    expect(result.table[0].responsible.name).toBe("Ana Gestora");
    expect(result.cards[0].progress).toBe(100);
  });

  it("returns detailed launch tabs with timeline and indicators", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Expert X",
      expert: "Expert X",
      product: "Produto Y",
      responsibleUserId: "user-1",
      status: "OPEN_CART",
      baseDate: new Date("2026-08-01T00:00:00.000Z"),
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-20T00:00:00.000Z"),
      phaseDates: {
        warmupStart: new Date("2026-08-01T00:00:00.000Z"),
        cpl1At: new Date("2026-08-05T00:00:00.000Z"),
        cartOpenAt: new Date("2026-08-15T00:00:00.000Z"),
        cartCloseAt: new Date("2026-08-20T00:00:00.000Z")
      },
      goals: {
        leadTarget: 1000,
        salesTarget: 100,
        revenueTarget: 30000
      },
      milestones: [
        { name: "Aquecimento", scheduledAt: new Date("2026-08-02T00:00:00.000Z") }
      ],
      active: true,
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
      updatedAt: new Date("2026-07-11T00:00:00.000Z")
    });
    strategyModel.find.mockReturnValue(sortedResult([
      {
        id: "strategy-1",
        title: "Planejamento",
        status: "APPROVED",
        completionPercentage: 100
      }
    ]));
    offerModel.find.mockReturnValue(sortedResult([{ id: "offer-1", isCurrent: true, version: 1, product: "Produto Y", transformation: "Transformar", promise: "Promessa", benefits: [], differentials: [], avatarVersion: 1, positioningContext: null, active: true, createdAt: new Date(), updatedAt: new Date() }]));
    positioningModel.find.mockReturnValue(sortedResult([{ id: "positioning-1", isCurrent: true, version: 1, thesis: "Tese", centralPromise: "Promessa", differentiators: [], references: [], offerVersion: 1, active: true, createdAt: new Date(), updatedAt: new Date() }]));
    editorialLineModel.find.mockReturnValue(sortedResult([{ id: "ed-1", isCurrent: true, version: 1, pillars: [], avatarVersion: 1, offerVersion: 1, positioningVersion: 1, active: true, createdAt: new Date(), updatedAt: new Date() }]));
    contentPlanModel.find.mockReturnValue(sortedResult([{ id: "cp-1", isCurrent: true, version: 1, items: [], editorialLineVersion: 1, active: true, createdAt: new Date(), updatedAt: new Date() }]));
    smartScheduleModel.find.mockReturnValue(sortedResult([{ id: "ss-1", isCurrent: true, version: 1, objective: "Meta", periodStart: new Date("2026-08-01T00:00:00.000Z"), periodEnd: new Date("2026-08-20T00:00:00.000Z"), operationalCadenceDays: 2, contentPlanVersion: 1, activities: [{ id: "activity-1", theme: "Tema", objective: "Objetivo", stage: "Aquecimento", deliveryType: "Reel", area: "Social", suggestedResponsibleRole: "SOCIAL_MEDIA", dueAt: new Date("2026-08-03T00:00:00.000Z"), status: "PLANNED" }], active: true, createdAt: new Date(), updatedAt: new Date() }]));
    expertApprovalModel.find.mockReturnValue(sortedResult([{ id: "ea-1", isCurrent: true, version: 1, status: "APPROVED", submittedAt: new Date(), submittedBy: "user-1", decisionAt: new Date(), decidedBy: "expert-1", observations: null, marketResearchVersion: 1, competitorResearchCount: 0, avatarVersion: 1, offerVersion: 1, positioningVersion: 1, editorialLineVersion: 1, contentPlanVersion: 1, smartScheduleVersion: 1, active: true, createdAt: new Date(), updatedAt: new Date() }]));
    trafficCampaignModel.find.mockReturnValue(sortedResult([{ id: "campaign-1", name: "Campanha 1", status: "ACTIVE", channel: "META", periodStart: new Date("2026-08-10T00:00:00.000Z"), periodEnd: new Date("2026-08-20T00:00:00.000Z"), budget: 2500 }]));
    contentApprovalModel.find.mockReturnValue(sortedResult([{ id: "approval-1", contentType: "REEL", contentId: "reel-1", currentStatus: "APPROVED" }]));
    assetLibraryModel.find.mockReturnValue(sortedResult([{ id: "asset-1", name: "Drive de pecas", type: "FOLDER", status: "AVAILABLE", origin: "DRIVE", updatedAt: new Date() }]));
    auditEventModel.find.mockReturnValue(sortedResult([{ id: "audit-1", action: "LAUNCH_CREATED", actorUserId: "user-1", context: {}, occurredAt: new Date() }]));
    reelModel.find.mockReturnValue(sortedResult([{ id: "reel-1", active: true, operationalStatus: "READY" }]));

    const result = await launchService.getById("launch-id");

    expect(result.progress).toBeGreaterThan(0);
    expect(result.tabs.schedule.timeline.length).toBeGreaterThan(1);
    expect(result.tabs.campaigns.total).toBe(1);
    expect(result.tabs.contents.total).toBe(1);
    expect(result.tabs.files[0].name).toBe("Drive de pecas");
  });
});

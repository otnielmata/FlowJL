import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
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
  findOne: vi.fn(),
  updateOne: vi.fn(),
  create: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
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

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { expertApprovalService } = await import("../src/services/expert-approval.service.js");

function mockSortedFindOne(model, value) {
  model.findOne.mockReturnValue({
    sort: vi.fn().mockResolvedValue(value)
  });
}

describe("expertApprovalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      expert: "Expert X",
      product: "Produto Y"
    });
    competitorResearchModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([{ id: "competitor-1" }])
    });
    mockSortedFindOne(marketResearchModel, { id: "research-v1", version: 1 });
    mockSortedFindOne(avatarModel, { id: "avatar-v2", version: 2 });
    mockSortedFindOne(offerModel, { id: "offer-v2", version: 2 });
    mockSortedFindOne(positioningModel, { id: "positioning-v2", version: 2 });
    mockSortedFindOne(editorialLineModel, { id: "editorial-v2", version: 2 });
    mockSortedFindOne(contentPlanModel, { id: "content-plan-v2", version: 2 });
    mockSortedFindOne(smartScheduleModel, { id: "schedule-v3", version: 3 });
    auditServiceMock.record.mockResolvedValue(undefined);
    expertApprovalModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("submits a complete planning package for expert review", async () => {
    mockSortedFindOne(expertApprovalModel, null);
    expertApprovalModel.create.mockResolvedValue({
      id: "approval-v1",
      launchId: "launch-id",
      version: 1,
      status: "IN_REVIEW",
      submittedAt: new Date("2026-07-11T12:00:00.000Z"),
      submittedBy: "strategist-id",
      decisionAt: null,
      decidedBy: null,
      observations: "Pronto para revisao",
      marketResearchVersion: 1,
      competitorResearchCount: 1,
      avatarVersion: 2,
      offerVersion: 2,
      positioningVersion: 2,
      editorialLineVersion: 2,
      contentPlanVersion: 2,
      smartScheduleVersion: 3,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await expertApprovalService.submit("strategist-id", "launch-id", {
      observations: " Pronto para revisao "
    });

    expect(expertApprovalModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-id",
        version: 1,
        status: "IN_REVIEW",
        submittedBy: "strategist-id",
        observations: "Pronto para revisao",
        marketResearchVersion: 1,
        competitorResearchCount: 1,
        avatarVersion: 2,
        offerVersion: 2,
        positioningVersion: 2,
        editorialLineVersion: 2,
        contentPlanVersion: 2,
        smartScheduleVersion: 3,
        isCurrent: true,
        active: true
      })
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "EXPERT_APPROVAL_SUBMITTED",
      targetType: "EXPERT_APPROVAL",
      targetId: "approval-v1",
      context: {
        launchId: "launch-id",
        version: 1,
        status: "IN_REVIEW",
        smartScheduleVersion: 3
      }
    });
    expect(result.status).toBe("IN_REVIEW");
    expect(result.observations).toBe("Pronto para revisao");
  });

  it("rejects submission when planning is incomplete", async () => {
    mockSortedFindOne(contentPlanModel, null);
    mockSortedFindOne(smartScheduleModel, null);

    await expect(expertApprovalService.submit("strategist-id", "launch-id", {})).rejects.toMatchObject({
      statusCode: 400,
      message: "Expert approval requires a complete planning package",
      details: {
        missingRequirements: ["contentPlan", "smartSchedule"]
      }
    });
  });

  it("allows a rejected planning package to be resubmitted", async () => {
    mockSortedFindOne(expertApprovalModel, {
      id: "approval-v2",
      launchId: "launch-id",
      version: 2,
      status: "REJECTED",
      createdBy: "strategist-id"
    });
    expertApprovalModel.create.mockResolvedValue({
      id: "approval-v3",
      launchId: "launch-id",
      version: 3,
      status: "IN_REVIEW",
      submittedAt: new Date("2026-07-11T12:30:00.000Z"),
      submittedBy: "strategist-id",
      decisionAt: null,
      decidedBy: null,
      observations: null,
      marketResearchVersion: 1,
      competitorResearchCount: 1,
      avatarVersion: 2,
      offerVersion: 2,
      positioningVersion: 2,
      editorialLineVersion: 2,
      contentPlanVersion: 2,
      smartScheduleVersion: 3,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T12:30:00.000Z"),
      updatedAt: new Date("2026-07-11T12:30:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await expertApprovalService.submit("strategist-id", "launch-id", {});

    expect(expertApprovalModel.updateOne).toHaveBeenCalledWith(
      { _id: "approval-v2" },
      {
        $set: {
          isCurrent: false,
          active: false,
          updatedBy: "strategist-id"
        }
      }
    );
    expect(expertApprovalModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 3,
        status: "IN_REVIEW"
      })
    );
    expect(result.version).toBe(3);
  });

  it("records the expert decision with observations", async () => {
    mockSortedFindOne(expertApprovalModel, {
      id: "approval-v1",
      launchId: "launch-id",
      version: 1,
      status: "IN_REVIEW",
      submittedAt: new Date("2026-07-11T12:00:00.000Z"),
      submittedBy: "strategist-id",
      marketResearchVersion: 1,
      competitorResearchCount: 1,
      avatarVersion: 2,
      offerVersion: 2,
      positioningVersion: 2,
      editorialLineVersion: 2,
      contentPlanVersion: 2,
      smartScheduleVersion: 3,
      createdBy: "strategist-id"
    });
    expertApprovalModel.create.mockResolvedValue({
      id: "approval-v2",
      launchId: "launch-id",
      version: 2,
      status: "APPROVED",
      submittedAt: new Date("2026-07-11T12:00:00.000Z"),
      submittedBy: "strategist-id",
      decisionAt: new Date("2026-07-11T13:00:00.000Z"),
      decidedBy: "expert-id",
      observations: "Aprovado com ajustes leves",
      marketResearchVersion: 1,
      competitorResearchCount: 1,
      avatarVersion: 2,
      offerVersion: 2,
      positioningVersion: 2,
      editorialLineVersion: 2,
      contentPlanVersion: 2,
      smartScheduleVersion: 3,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T13:00:00.000Z"),
      updatedAt: new Date("2026-07-11T13:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "expert-id"
    });

    const result = await expertApprovalService.decide("expert-id", "launch-id", {
      status: "APPROVED",
      observations: " Aprovado com ajustes leves "
    });

    expect(expertApprovalModel.updateOne).toHaveBeenCalledWith(
      { _id: "approval-v1" },
      {
        $set: {
          isCurrent: false,
          active: false,
          updatedBy: "expert-id"
        }
      }
    );
    expect(expertApprovalModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-id",
        version: 2,
        status: "APPROVED",
        submittedBy: "strategist-id",
        decidedBy: "expert-id",
        observations: "Aprovado com ajustes leves"
      })
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "expert-id",
      action: "EXPERT_APPROVAL_APPROVED",
      targetType: "EXPERT_APPROVAL",
      targetId: "approval-v2",
      context: {
        launchId: "launch-id",
        version: 2,
        previousVersion: 1,
        status: "APPROVED"
      }
    });
    expect(result.status).toBe("APPROVED");
    expect(result.decidedBy).toBe("expert-id");
  });
});

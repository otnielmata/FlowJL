import { beforeEach, describe, expect, it, vi } from "vitest";

const reelModel = {
  create: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const contentPlanModel = {
  findById: vi.fn()
};

const contentIdeaModel = {
  findById: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/reel.model.js", () => ({
  Reel: reelModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/content-plan.model.js", () => ({
  ContentPlan: contentPlanModel
}));

vi.mock("../src/models/content-idea.model.js", () => ({
  ContentIdea: contentIdeaModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { reelService } = await import("../src/services/reel.service.js");

describe("reelService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    reelModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    launchModel.findById.mockResolvedValue(null);
    contentPlanModel.findById.mockResolvedValue(null);
    contentIdeaModel.findById.mockResolvedValue(null);
  });

  it("creates a reel with essential metadata and content plan context", async () => {
    contentPlanModel.findById.mockResolvedValue({
      id: "plan-id",
      launchId: "launch-id"
    });
    reelModel.create.mockResolvedValue({
      id: "reel-id",
      launchId: "launch-id",
      contentPlanId: "plan-id",
      contentIdeaId: null,
      sourceType: "CONTENT_PLAN",
      theme: "Tema de autoridade",
      objective: "Conversao",
      hook: "Hook forte",
      cta: "Comente eu quero",
      script: null,
      caption: null,
      operationalStatus: "DRAFT",
      approvalStatus: "PENDING",
      scheduledAt: new Date("2026-07-20T12:00:00.000Z"),
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await reelService.create("social-id", {
      contentPlanId: "plan-id",
      sourceType: "CONTENT_PLAN",
      theme: " Tema de autoridade ",
      objective: " Conversao ",
      hook: " Hook forte ",
      cta: " Comente eu quero ",
      operationalStatus: "DRAFT",
      scheduledAt: "2026-07-20T12:00:00.000Z"
    });

    expect(contentPlanModel.findById).toHaveBeenCalledWith("plan-id");
    expect(reelModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      contentPlanId: "plan-id",
      contentIdeaId: null,
      sourceType: "CONTENT_PLAN",
      theme: "Tema de autoridade",
      objective: "Conversao",
      hook: "Hook forte",
      cta: "Comente eu quero",
      script: null,
      caption: null,
      operationalStatus: "DRAFT",
      approvalStatus: "PENDING",
      scheduledAt: new Date("2026-07-20T12:00:00.000Z"),
      active: true,
      createdBy: "social-id",
      updatedBy: "social-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "REEL_CREATED",
      targetType: "REEL",
      targetId: "reel-id",
      context: {
        launchId: "launch-id",
        contentPlanId: "plan-id",
        contentIdeaId: null,
        operationalStatus: "DRAFT",
        approvalStatus: "PENDING"
      }
    });
    expect(result.scheduledAt).toEqual(new Date("2026-07-20T12:00:00.000Z"));
  });

  it("updates script, caption and statuses with audit", async () => {
    reelModel.findById.mockResolvedValue({
      id: "reel-id",
      launchId: "launch-id",
      contentPlanId: "plan-id",
      contentIdeaId: null,
      sourceType: "CONTENT_PLAN",
      theme: "Tema de autoridade",
      objective: "Conversao",
      hook: "Hook forte",
      cta: "Comente eu quero",
      script: null,
      caption: null,
      operationalStatus: "DRAFT",
      approvalStatus: "PENDING",
      scheduledAt: null,
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await reelService.update("social-id", "reel-id", {
      script: " Roteiro atualizado ",
      caption: " Legenda final ",
      operationalStatus: "IN_REVIEW",
      approvalStatus: "APPROVED",
      scheduledAt: "2026-07-21T09:00:00.000Z"
    });

    expect(reelModel.updateOne).toHaveBeenCalledWith(
      { _id: "reel-id" },
      {
        $set: {
          script: "Roteiro atualizado",
          caption: "Legenda final",
          operationalStatus: "IN_REVIEW",
          approvalStatus: "APPROVED",
          scheduledAt: new Date("2026-07-21T09:00:00.000Z"),
          updatedBy: "social-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "REEL_UPDATED",
      targetType: "REEL",
      targetId: "reel-id",
      context: {
        launchId: "launch-id",
        previousOperationalStatus: "DRAFT",
        operationalStatus: "IN_REVIEW",
        previousApprovalStatus: "PENDING",
        approvalStatus: "APPROVED"
      }
    });
    expect(result.script).toBe("Roteiro atualizado");
    expect(result.operationalStatus).toBe("IN_REVIEW");
    expect(result.approvalStatus).toBe("APPROVED");
  });

  it("rejects reel creation without minimum context", async () => {
    await expect(
      reelService.create("social-id", {
        sourceType: "MANUAL",
        theme: "Tema",
        objective: "Conversao",
        hook: "Hook",
        cta: "CTA",
        operationalStatus: "DRAFT"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Reel requires a launch or content plan context"
    });
  });

  it("rejects reel creation without theme or objective", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id"
    });

    await expect(
      reelService.create("social-id", {
        launchId: "launch-id",
        sourceType: "MANUAL",
        theme: " ",
        objective: "Conversao",
        hook: "Hook",
        cta: "CTA",
        operationalStatus: "DRAFT"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Reel requires theme and objective"
    });
  });
});

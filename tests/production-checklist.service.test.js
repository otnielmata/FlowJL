import { beforeEach, describe, expect, it, vi } from "vitest";

const productionChecklistModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const contentApprovalModel = {
  findOne: vi.fn()
};

const reelModel = {
  findById: vi.fn()
};

const carouselModel = {
  findById: vi.fn()
};

const storySequenceModel = {
  findById: vi.fn()
};

const emailCampaignModel = {
  findById: vi.fn()
};

const youtubeContentModel = {
  findById: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/models/production-checklist.model.js", () => ({
  ProductionChecklist: productionChecklistModel
}));

vi.mock("../src/models/content-approval.model.js", () => ({
  ContentApproval: contentApprovalModel
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
  auditService
}));

const { productionChecklistService } = await import("../src/services/production-checklist.service.js");

describe("productionChecklistService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a partial checklist for approved content with configurable items", async () => {
    reelModel.findById.mockResolvedValue({
      id: "reel-1",
      launchId: "launch-1",
      theme: "Reel de abertura",
      operationalStatus: "APPROVED",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue({
      id: "approval-1",
      currentStatus: "APPROVED"
    });
    productionChecklistModel.create.mockImplementation(async (payload) => ({
      id: "checklist-1",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await productionChecklistService.create("user-1", {
      contentType: "REEL",
      contentId: "reel-1",
      items: [
        {
          id: "8f56b42f-c647-4902-8148-5cf9159b3916",
          label: "Legenda revisada",
          required: true,
          completed: true
        },
        {
          id: "d31fec0c-20dc-4cde-aeaf-6b2f7f544247",
          label: "Arquivo final validado",
          required: true,
          completed: false
        }
      ]
    });

    expect(productionChecklistModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-1",
        contentType: "REEL",
        contentId: "reel-1",
        status: "PARTIAL"
      })
    );
    expect(result.status).toBe("PARTIAL");
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        label: "Legenda revisada",
        completed: true,
        completedBy: "user-1"
      })
    );
    expect(result.content).toEqual({
      id: "reel-1",
      type: "REEL",
      launchId: "launch-1",
      title: "Reel de abertura",
      status: "APPROVED"
    });
  });

  it("rejects final conclusion when required items are pending", async () => {
    productionChecklistModel.findById.mockResolvedValue({
      id: "checklist-2",
      launchId: "launch-1",
      contentType: "CAROUSEL",
      contentId: "carousel-1",
      status: "PARTIAL",
      active: true,
      items: [
        {
          id: "item-1",
          label: "Design final validado",
          required: true,
          completed: false
        }
      ],
      history: []
    });
    carouselModel.findById.mockResolvedValue({
      id: "carousel-1",
      launchId: "launch-1",
      theme: "Carrossel",
      operationalStatus: "APPROVED",
      active: true
    });

    await expect(
      productionChecklistService.update("user-2", "checklist-2", {
        conclude: true
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Required checklist items must be completed before final conclusion"
    });
  });

  it("completes checklist when all required items are done and stores history", async () => {
    productionChecklistModel.findById.mockResolvedValue({
      id: "checklist-3",
      launchId: "launch-2",
      contentType: "EMAIL_CAMPAIGN",
      contentId: "email-1",
      status: "PARTIAL",
      active: true,
      items: [
        {
          id: "item-1",
          label: "Links testados",
          required: true,
          completed: false,
          completedBy: null,
          completedAt: null
        }
      ],
      history: [
        {
          id: "history-1",
          action: "CREATED",
          fromStatus: null,
          toStatus: "PARTIAL",
          actedBy: "user-1",
          actedAt: new Date("2026-07-12T12:00:00.000Z"),
          itemsSnapshot: []
        }
      ],
      toObject() {
        return this;
      }
    });
    emailCampaignModel.findById.mockResolvedValue({
      id: "email-1",
      launchId: "launch-2",
      subject: "Email final",
      status: "APPROVED",
      active: true
    });

    const result = await productionChecklistService.update("user-2", "checklist-3", {
      items: [
        {
          id: "item-1",
          completed: true
        }
      ],
      conclude: true
    });

    expect(productionChecklistModel.updateOne).toHaveBeenCalledWith(
      { _id: "checklist-3" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "COMPLETED",
          updatedBy: "user-2"
        })
      })
    );
    expect(result.status).toBe("COMPLETED");
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "COMPLETED",
        fromStatus: "PARTIAL",
        toStatus: "COMPLETED",
        actedBy: "user-2"
      })
    );
  });

  it("reopens a completed checklist and preserves audit history", async () => {
    productionChecklistModel.findById.mockResolvedValue({
      id: "checklist-4",
      launchId: "launch-3",
      contentType: "YOUTUBE_CONTENT",
      contentId: "youtube-1",
      status: "COMPLETED",
      active: true,
      items: [
        {
          id: "item-1",
          label: "Thumbnail validada",
          required: true,
          completed: true,
          completedBy: "user-1",
          completedAt: new Date("2026-07-12T12:00:00.000Z")
        }
      ],
      history: [],
      toObject() {
        return this;
      }
    });
    youtubeContentModel.findById.mockResolvedValue({
      id: "youtube-1",
      launchId: "launch-3",
      theme: "Video final",
      operationalStatus: "APPROVED",
      active: true
    });

    const result = await productionChecklistService.reopen("user-3", "checklist-4", {
      reason: "Ajuste na thumbnail"
    });

    expect(productionChecklistModel.updateOne).toHaveBeenCalledWith(
      { _id: "checklist-4" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "REOPENED",
          updatedBy: "user-3"
        })
      })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PRODUCTION_CHECKLIST_REOPENED",
        targetId: "checklist-4"
      })
    );
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "REOPENED",
        reason: "Ajuste na thumbnail",
        toStatus: "REOPENED"
      })
    );
  });

  it("rejects checklist creation for content that is not approved", async () => {
    storySequenceModel.findById.mockResolvedValue({
      id: "story-1",
      launchId: "launch-4",
      theme: "Stories",
      operationalStatus: "IN_REVIEW",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue({
      id: "approval-2",
      currentStatus: "REVIEW"
    });

    await expect(
      productionChecklistService.create("user-1", {
        contentType: "STORY_SEQUENCE",
        contentId: "story-1"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Content must be approved before production checklist execution"
    });
  });
});

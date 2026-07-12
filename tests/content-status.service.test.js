import { beforeEach, describe, expect, it, vi } from "vitest";

const contentStatusHistoryModel = {
  create: vi.fn(),
  find: vi.fn()
};

const productionChecklistModel = {
  findOne: vi.fn()
};

const reelModel = {
  findById: vi.fn(),
  updateOne: vi.fn()
};

const carouselModel = {
  findById: vi.fn(),
  updateOne: vi.fn()
};

const storySequenceModel = {
  findById: vi.fn(),
  updateOne: vi.fn()
};

const emailCampaignModel = {
  findById: vi.fn(),
  updateOne: vi.fn()
};

const youtubeContentModel = {
  findById: vi.fn(),
  updateOne: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/models/content-status-history.model.js", () => ({
  ContentStatusHistory: contentStatusHistoryModel
}));

vi.mock("../src/models/production-checklist.model.js", () => ({
  ProductionChecklist: productionChecklistModel
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

const { contentStatusService } = await import("../src/services/content-status.service.js");

function asDocument(data) {
  return {
    ...data,
    toObject() {
      return this;
    }
  };
}

describe("contentStatusService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates content status when transition is allowed and records history", async () => {
    reelModel.findById.mockResolvedValue(
      asDocument({
        id: "reel-1",
        launchId: "launch-1",
        theme: "Reel hero",
        operationalStatus: "DRAFT",
        active: true,
        createdAt: new Date("2026-07-12T12:00:00.000Z"),
        updatedAt: new Date("2026-07-12T12:00:00.000Z")
      })
    );
    contentStatusHistoryModel.create.mockResolvedValue({
      id: "history-1",
      launchId: "launch-1",
      contentType: "REEL",
      contentId: "reel-1",
      fromStatus: "DRAFT",
      toStatus: "IN_REVIEW",
      reason: "Pronto para revisao",
      changedBy: "user-1",
      changedAt: new Date("2026-07-12T13:00:00.000Z")
    });

    const result = await contentStatusService.changeStatus("user-1", "REEL", "reel-1", {
      targetStatus: "IN_REVIEW",
      reason: "Pronto para revisao"
    });

    expect(reelModel.updateOne).toHaveBeenCalledWith(
      { _id: "reel-1" },
      {
        $set: {
          operationalStatus: "IN_REVIEW",
          updatedBy: "user-1"
        }
      }
    );
    expect(contentStatusHistoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "REEL",
        fromStatus: "DRAFT",
        toStatus: "IN_REVIEW",
        changedBy: "user-1"
      })
    );
    expect(result.status).toBe("IN_REVIEW");
    expect(result.history[0]).toEqual(
      expect.objectContaining({
        fromStatus: "DRAFT",
        toStatus: "IN_REVIEW"
      })
    );
  });

  it("rejects invalid transition jumps", async () => {
    carouselModel.findById.mockResolvedValue(
      asDocument({
        id: "carousel-1",
        launchId: "launch-1",
        theme: "Carrossel",
        operationalStatus: "DRAFT",
        active: true
      })
    );

    await expect(
      contentStatusService.changeStatus("user-1", "CAROUSEL", "carousel-1", {
        targetStatus: "SCHEDULED"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Invalid content status transition"
    });
  });

  it("blocks status changes after content is published", async () => {
    storySequenceModel.findById.mockResolvedValue(
      asDocument({
        id: "story-1",
        launchId: "launch-1",
        theme: "Stories",
        operationalStatus: "PUBLISHED",
        active: true
      })
    );

    await expect(
      contentStatusService.changeStatus("user-1", "STORY_SEQUENCE", "story-1", {
        targetStatus: "SCHEDULED"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Published content status cannot be changed"
    });
  });

  it("requires completed production checklist before publishing", async () => {
    emailCampaignModel.findById.mockResolvedValue(
      asDocument({
        id: "email-1",
        launchId: "launch-2",
        subject: "Email final",
        status: "SCHEDULED",
        active: true
      })
    );
    productionChecklistModel.findOne.mockResolvedValue({
      id: "checklist-1",
      status: "PARTIAL"
    });

    await expect(
      contentStatusService.changeStatus("user-2", "EMAIL_CAMPAIGN", "email-1", {
        targetStatus: "SENT"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Production checklist must be completed before publication"
    });
  });

  it("publishes content when checklist is completed", async () => {
    youtubeContentModel.findById.mockResolvedValue(
      asDocument({
        id: "youtube-1",
        launchId: "launch-3",
        theme: "Video final",
        operationalStatus: "SCHEDULED",
        active: true
      })
    );
    productionChecklistModel.findOne.mockResolvedValue({
      id: "checklist-2",
      status: "COMPLETED"
    });
    contentStatusHistoryModel.create.mockResolvedValue({
      id: "history-2",
      launchId: "launch-3",
      contentType: "YOUTUBE_CONTENT",
      contentId: "youtube-1",
      fromStatus: "SCHEDULED",
      toStatus: "PUBLISHED",
      reason: null,
      changedBy: "user-3",
      changedAt: new Date("2026-07-12T13:00:00.000Z")
    });

    const result = await contentStatusService.changeStatus("user-3", "YOUTUBE_CONTENT", "youtube-1", {
      targetStatus: "PUBLISHED"
    });

    expect(youtubeContentModel.updateOne).toHaveBeenCalledWith(
      { _id: "youtube-1" },
      {
        $set: {
          operationalStatus: "PUBLISHED",
          updatedBy: "user-3"
        }
      }
    );
    expect(result.status).toBe("PUBLISHED");
  });

  it("lists status history for content", async () => {
    reelModel.findById.mockResolvedValue(
      asDocument({
        id: "reel-2",
        launchId: "launch-4",
        theme: "Reel historico",
        operationalStatus: "IN_REVIEW",
        active: true
      })
    );
    contentStatusHistoryModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "history-3",
          launchId: "launch-4",
          contentType: "REEL",
          contentId: "reel-2",
          fromStatus: "DRAFT",
          toStatus: "IN_REVIEW",
          reason: null,
          changedBy: "user-1",
          changedAt: new Date("2026-07-12T13:00:00.000Z")
        }
      ])
    });

    const result = await contentStatusService.listHistory("REEL", "reel-2");

    expect(contentStatusHistoryModel.find).toHaveBeenCalledWith({
      contentType: "REEL",
      contentId: "reel-2"
    });
    expect(result).toEqual([
      expect.objectContaining({
        fromStatus: "DRAFT",
        toStatus: "IN_REVIEW"
      })
    ]);
  });
});

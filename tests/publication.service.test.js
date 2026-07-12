import { beforeEach, describe, expect, it, vi } from "vitest";

const publicationModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const contentApprovalModel = {
  findOne: vi.fn(),
  updateOne: vi.fn()
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

vi.mock("../src/models/publication.model.js", () => ({
  Publication: publicationModel
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

const { publicationService } = await import("../src/services/publication.service.js");

describe("publicationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a planned publication for approved content", async () => {
    reelModel.findById.mockResolvedValue({
      id: "reel-1",
      launchId: "launch-1",
      theme: "Reel Hero",
      operationalStatus: "APPROVED",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue({
      id: "approval-1",
      currentStatus: "APPROVED",
      history: []
    });
    publicationModel.create.mockResolvedValue({
      id: "publication-1",
      launchId: "launch-1",
      contentType: "REEL",
      contentId: "reel-1",
      channel: "INSTAGRAM_REELS",
      publishAt: new Date("2026-07-22T10:00:00.000Z"),
      responsible: "Social Media",
      status: "PLANNED",
      issueReason: null,
      publishedAt: null,
      active: true,
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      createdBy: "user-1",
      updatedBy: "user-1"
    });

    const result = await publicationService.create("user-1", {
      contentType: "REEL",
      contentId: "reel-1",
      channel: "INSTAGRAM_REELS",
      publishAt: "2026-07-22T10:00:00.000Z",
      responsible: "Social Media"
    });

    expect(publicationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-1",
        contentType: "REEL",
        status: "PLANNED"
      })
    );
    expect(reelModel.updateOne).toHaveBeenCalledWith(
      { _id: "reel-1" },
      {
        $set: {
          updatedBy: "user-1",
          scheduledAt: new Date("2026-07-22T10:00:00.000Z")
        }
      }
    );
    expect(result.approvalStatus).toBe("APPROVED");
    expect(result.content.title).toBe("Reel Hero");
  });

  it("updates a publication to published and syncs approval history", async () => {
    publicationModel.findById.mockResolvedValue({
      id: "publication-2",
      launchId: "launch-2",
      contentType: "EMAIL_CAMPAIGN",
      contentId: "email-1",
      channel: "EMAIL",
      publishAt: new Date("2026-07-23T12:00:00.000Z"),
      responsible: "Ops",
      status: "SCHEDULED",
      issueReason: null,
      publishedAt: null,
      active: true,
      toObject() {
        return this;
      }
    });
    emailCampaignModel.findById.mockResolvedValue({
      id: "email-1",
      launchId: "launch-2",
      subject: "Assunto",
      status: "APPROVED",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue({
      id: "approval-2",
      currentStatus: "APPROVED",
      history: []
    });

    const result = await publicationService.update("user-2", "publication-2", {
      status: "PUBLISHED"
    });

    expect(emailCampaignModel.updateOne).toHaveBeenCalledWith(
      { _id: "email-1" },
      {
        $set: {
          updatedBy: "user-2",
          plannedSendAt: new Date("2026-07-23T12:00:00.000Z"),
          status: "SENT"
        }
      }
    );
    expect(contentApprovalModel.updateOne).toHaveBeenCalledWith(
      { _id: "approval-2" },
      expect.objectContaining({
        $set: expect.objectContaining({
          currentStatus: "PUBLISHED",
          updatedBy: "user-2"
        })
      })
    );
    expect(result.status).toBe("PUBLISHED");
    expect(result.approvalStatus).toBe("PUBLISHED");
  });

  it("rejects publication when content is not approved", async () => {
    storySequenceModel.findById.mockResolvedValue({
      id: "story-1",
      launchId: "launch-1",
      theme: "Stories",
      operationalStatus: "IN_REVIEW",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue({
      id: "approval-3",
      currentStatus: "EXPERT",
      history: []
    });

    await expect(
      publicationService.create("user-1", {
        contentType: "STORY_SEQUENCE",
        contentId: "story-1",
        channel: "INSTAGRAM_STORIES",
        publishAt: "2026-07-25T18:00:00.000Z",
        responsible: "Social Media"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Content must be approved before publication"
    });
  });

  it("lists publications with filters and public content metadata", async () => {
    publicationModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "publication-3",
          launchId: "launch-3",
          contentType: "YOUTUBE_CONTENT",
          contentId: "youtube-1",
          channel: "YOUTUBE",
          publishAt: new Date("2026-07-26T15:00:00.000Z"),
          responsible: "Video Team",
          status: "SCHEDULED",
          issueReason: null,
          publishedAt: null,
          active: true,
          createdAt: new Date("2026-07-12T12:00:00.000Z"),
          updatedAt: new Date("2026-07-12T12:00:00.000Z"),
          createdBy: "user-1",
          updatedBy: "user-1"
        }
      ])
    });
    youtubeContentModel.findById.mockResolvedValue({
      id: "youtube-1",
      launchId: "launch-3",
      theme: "Video Hero",
      operationalStatus: "SCHEDULED",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue({
      id: "approval-4",
      currentStatus: "APPROVED"
    });

    const result = await publicationService.list({
      launchId: "launch-3",
      status: "SCHEDULED"
    });

    expect(publicationModel.find).toHaveBeenCalledWith({
      active: true,
      launchId: "launch-3",
      status: "SCHEDULED"
    });
    expect(result[0].content).toEqual({
      id: "youtube-1",
      type: "YOUTUBE_CONTENT",
      launchId: "launch-3",
      title: "Video Hero",
      status: "SCHEDULED"
    });
  });
});

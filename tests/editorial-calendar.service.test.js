import { beforeEach, describe, expect, it, vi } from "vitest";

const editorialCalendarItemModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
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

vi.mock("../src/models/editorial-calendar-item.model.js", () => ({
  EditorialCalendarItem: editorialCalendarItemModel
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

const { editorialCalendarService } = await import("../src/services/editorial-calendar.service.js");

describe("editorialCalendarService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a calendar item from a valid base content and syncs scheduling metadata", async () => {
    reelModel.findById.mockResolvedValue({
      id: "reel-1",
      launchId: "launch-1",
      theme: "Reel Hero",
      operationalStatus: "APPROVED",
      active: true
    });
    editorialCalendarItemModel.create.mockResolvedValue({
      id: "calendar-1",
      launchId: "launch-1",
      contentType: "REEL",
      contentId: "reel-1",
      channel: "INSTAGRAM_REELS",
      publishAt: new Date("2026-07-20T14:00:00.000Z"),
      responsible: "Social Media",
      notes: "Publicar com CTA final",
      active: true,
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      createdBy: "user-1",
      updatedBy: "user-1"
    });

    const result = await editorialCalendarService.create("user-1", {
      contentType: "REEL",
      contentId: "reel-1",
      channel: "INSTAGRAM_REELS",
      publishAt: "2026-07-20T14:00:00.000Z",
      responsible: "Social Media",
      notes: "Publicar com CTA final"
    });

    expect(editorialCalendarItemModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-1",
        contentType: "REEL",
        contentId: "reel-1",
        channel: "INSTAGRAM_REELS",
        responsible: "Social Media"
      })
    );
    expect(reelModel.updateOne).toHaveBeenCalledWith(
      { _id: "reel-1" },
      {
        $set: {
          scheduledAt: new Date("2026-07-20T14:00:00.000Z"),
          updatedBy: "user-1"
        }
      }
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EDITORIAL_CALENDAR_ITEM_CREATED",
        targetType: "EDITORIAL_CALENDAR_ITEM",
        targetId: "calendar-1"
      })
    );
    expect(result.content).toEqual({
      id: "reel-1",
      type: "REEL",
      launchId: "launch-1",
      title: "Reel Hero",
      status: "APPROVED"
    });
  });

  it("lists calendar items grouped by date and sorted by time and channel", async () => {
    editorialCalendarItemModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "calendar-2",
          launchId: "launch-1",
          contentType: "CAROUSEL",
          contentId: "carousel-1",
          channel: "INSTAGRAM_FEED",
          publishAt: new Date("2026-07-21T13:00:00.000Z"),
          responsible: "Alice",
          notes: null,
          active: true,
          createdAt: new Date("2026-07-12T12:00:00.000Z"),
          updatedAt: new Date("2026-07-12T12:00:00.000Z"),
          createdBy: "user-1",
          updatedBy: "user-1"
        },
        {
          id: "calendar-3",
          launchId: "launch-1",
          contentType: "REEL",
          contentId: "reel-2",
          channel: "INSTAGRAM_REELS",
          publishAt: new Date("2026-07-21T09:00:00.000Z"),
          responsible: "Bob",
          notes: null,
          active: true,
          createdAt: new Date("2026-07-12T12:00:00.000Z"),
          updatedAt: new Date("2026-07-12T12:00:00.000Z"),
          createdBy: "user-1",
          updatedBy: "user-1"
        }
      ])
    });
    carouselModel.findById.mockResolvedValue({
      id: "carousel-1",
      launchId: "launch-1",
      theme: "Carousel Hero",
      operationalStatus: "SCHEDULED",
      active: true
    });
    reelModel.findById.mockResolvedValue({
      id: "reel-2",
      launchId: "launch-1",
      theme: "Reel Hook",
      operationalStatus: "APPROVED",
      active: true
    });

    const result = await editorialCalendarService.list({
      launchId: "launch-1",
      startAt: "2026-07-21T00:00:00.000Z",
      endAt: "2026-07-21T23:59:59.999Z"
    });

    expect(editorialCalendarItemModel.find).toHaveBeenCalledWith({
      active: true,
      launchId: "launch-1",
      publishAt: {
        $gte: new Date("2026-07-21T00:00:00.000Z"),
        $lte: new Date("2026-07-21T23:59:59.999Z")
      }
    });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].date).toBe("2026-07-21");
    expect(result.groups[0].items.map((item) => item.id)).toEqual(["calendar-3", "calendar-2"]);
  });

  it("rejects item creation when the base content does not exist", async () => {
    youtubeContentModel.findById.mockResolvedValue(null);

    await expect(
      editorialCalendarService.create("user-1", {
        contentType: "YOUTUBE_CONTENT",
        contentId: "youtube-1",
        channel: "YOUTUBE",
        publishAt: "2026-07-25T18:00:00.000Z",
        responsible: "Video Team"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Base content not found"
    });
  });

  it("updates schedule and responsible with audit trail", async () => {
    editorialCalendarItemModel.findById.mockResolvedValue({
      id: "calendar-9",
      launchId: "launch-1",
      contentType: "STORY_SEQUENCE",
      contentId: "story-1",
      channel: "INSTAGRAM_STORIES",
      publishAt: new Date("2026-07-20T12:00:00.000Z"),
      responsible: "Time A",
      notes: null,
      active: true,
      toObject() {
        return this;
      }
    });
    storySequenceModel.findById.mockResolvedValue({
      id: "story-1",
      launchId: "launch-1",
      theme: "Stories da Semana",
      operationalStatus: "SCHEDULED",
      active: true
    });

    const result = await editorialCalendarService.update("user-2", "calendar-9", {
      publishAt: "2026-07-21T15:00:00.000Z",
      responsible: "Time B"
    });

    expect(editorialCalendarItemModel.updateOne).toHaveBeenCalledWith(
      { _id: "calendar-9" },
      {
        $set: expect.objectContaining({
          publishAt: new Date("2026-07-21T15:00:00.000Z"),
          responsible: "Time B",
          updatedBy: "user-2"
        })
      }
    );
    expect(storySequenceModel.updateOne).toHaveBeenCalledWith(
      { _id: "story-1" },
      {
        $set: {
          publishAt: new Date("2026-07-21T15:00:00.000Z"),
          updatedBy: "user-2"
        }
      }
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EDITORIAL_CALENDAR_ITEM_UPDATED",
        targetId: "calendar-9"
      })
    );
    expect(result.responsible).toBe("Time B");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const publicationService = {
  list: vi.fn(),
  findByContent: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  recordMetrics: vi.fn()
};

vi.mock("../src/services/publication.service.js", () => ({
  publicationService
}));

const { socialMediaService } = await import("../src/services/social-media.service.js");

describe("socialMediaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds editorial, weekly and feed views from publications", async () => {
    publicationService.list.mockResolvedValue([
      {
        id: "publication-1",
        launchId: "launch-1",
        channel: "INSTAGRAM_FEED",
        publishAt: new Date("2026-07-20T10:00:00.000Z"),
        status: "PLANNED",
        approvalStatus: "APPROVED",
        responsible: "Ana",
        preview: {
          headline: "Tema 1"
        },
        metrics: {
          reach: 0
        },
        content: {
          id: "content-1",
          type: "REEL"
        }
      },
      {
        id: "publication-2",
        launchId: "launch-1",
        channel: "INSTAGRAM_STORIES",
        publishAt: new Date("2026-07-21T14:00:00.000Z"),
        status: "SCHEDULED",
        approvalStatus: "APPROVED",
        responsible: "Ana",
        preview: {
          headline: "Tema 2"
        },
        metrics: {
          reach: 0
        },
        content: {
          id: "content-2",
          type: "STORY_SEQUENCE"
        }
      },
      {
        id: "publication-3",
        launchId: "launch-1",
        channel: "YOUTUBE",
        publishAt: new Date("2026-07-22T19:00:00.000Z"),
        status: "PUBLISHED",
        approvalStatus: "PUBLISHED",
        responsible: "Leo",
        preview: {
          headline: "Tema 3"
        },
        metrics: {
          reach: 1200
        },
        content: {
          id: "content-3",
          type: "YOUTUBE_CONTENT"
        }
      }
    ]);

    const result = await socialMediaService.list({
      launchId: "launch-1"
    });

    expect(result.summary).toEqual({
      pending: 1,
      scheduled: 1,
      completed: 1,
      total: 3
    });
    expect(result.views.editorialCalendar).toHaveLength(3);
    expect(result.views.weeklyGrid).toHaveLength(1);
    expect(result.views.visualFeed[0].id).toBe("publication-3");
    expect(result.views.statuses.pending[0].id).toBe("publication-1");
    expect(result.views.statuses.scheduled[0].id).toBe("publication-2");
    expect(result.views.statuses.completed[0].id).toBe("publication-3");
  });

  it("creates a scheduled social media publication when none exists", async () => {
    publicationService.findByContent.mockResolvedValue(null);
    publicationService.create.mockResolvedValue({
      id: "publication-10",
      status: "SCHEDULED"
    });

    const result = await socialMediaService.schedulePublication("user-1", {
      contentType: "REEL",
      contentId: "content-10",
      channel: "INSTAGRAM_REELS",
      publishAt: "2026-07-24T12:00:00.000Z",
      responsible: "Social Team",
      action: "SCHEDULE"
    });

    expect(publicationService.create).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        contentType: "REEL",
        status: "SCHEDULED"
      })
    );
    expect(result.action).toBe("SCHEDULE");
    expect(result.publication.id).toBe("publication-10");
  });

  it("records performance through the publication service", async () => {
    publicationService.recordMetrics.mockResolvedValue({
      id: "publication-20",
      metrics: {
        publishedUrl: "https://example.com/post",
        reach: 500
      }
    });

    const result = await socialMediaService.recordPerformance("user-2", "publication-20", {
      publishedUrl: "https://example.com/post",
      reach: 500,
      likes: 30,
      comments: 5,
      shares: 2,
      saves: 4
    });

    expect(publicationService.recordMetrics).toHaveBeenCalledWith("user-2", "publication-20", {
      publishedUrl: "https://example.com/post",
      reach: 500,
      likes: 30,
      comments: 5,
      shares: 2,
      saves: 4
    });
    expect(result.metrics.reach).toBe(500);
  });
});

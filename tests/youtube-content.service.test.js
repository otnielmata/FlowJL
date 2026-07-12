import { beforeEach, describe, expect, it, vi } from "vitest";

const youtubeContentModel = {
  create: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const editorialLineModel = {
  findOne: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/youtube-content.model.js", () => ({
  YouTubeContent: youtubeContentModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/editorial-line.model.js", () => ({
  EditorialLine: editorialLineModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { youtubeContentService } = await import("../src/services/youtube-content.service.js");

describe("youtubeContentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    youtubeContentModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates a youtube pauta linked to launch and editorial line", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id"
    });
    editorialLineModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        version: 3
      })
    });
    youtubeContentModel.create.mockResolvedValue({
      id: "youtube-id",
      launchId: "launch-id",
      editorialLineVersion: 3,
      theme: "Video de abertura",
      objective: "Gerar autoridade",
      format: "Aula",
      cta: "Comente eu quero",
      script: null,
      ownerRole: null,
      operationalStatus: "PLANNED",
      recordingAt: new Date("2026-07-20T13:00:00.000Z"),
      publishAt: new Date("2026-07-22T18:00:00.000Z"),
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-12T10:00:00.000Z"),
      updatedAt: new Date("2026-07-12T10:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await youtubeContentService.create("social-id", {
      launchId: "launch-id",
      theme: " Video de abertura ",
      objective: " Gerar autoridade ",
      format: " Aula ",
      cta: " Comente eu quero ",
      recordingAt: "2026-07-20T13:00:00.000Z",
      publishAt: "2026-07-22T18:00:00.000Z"
    });

    expect(youtubeContentModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      editorialLineVersion: 3,
      theme: "Video de abertura",
      objective: "Gerar autoridade",
      format: "Aula",
      cta: "Comente eu quero",
      script: null,
      ownerRole: null,
      operationalStatus: "PLANNED",
      recordingAt: new Date("2026-07-20T13:00:00.000Z"),
      publishAt: new Date("2026-07-22T18:00:00.000Z"),
      active: true,
      deactivatedAt: null,
      createdBy: "social-id",
      updatedBy: "social-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "YOUTUBE_CONTENT_CREATED",
      targetType: "YOUTUBE_CONTENT",
      targetId: "youtube-id",
      context: {
        launchId: "launch-id",
        editorialLineVersion: 3,
        format: "Aula",
        operationalStatus: "PLANNED"
      }
    });
    expect(result.recordingAt).toEqual(new Date("2026-07-20T13:00:00.000Z"));
    expect(result.publishAt).toEqual(new Date("2026-07-22T18:00:00.000Z"));
  });

  it("updates script, owner and operational status with audit", async () => {
    youtubeContentModel.findById.mockResolvedValue({
      id: "youtube-id",
      launchId: "launch-id",
      editorialLineVersion: 3,
      theme: "Video de abertura",
      objective: "Gerar autoridade",
      format: "Aula",
      cta: "Comente eu quero",
      script: null,
      ownerRole: null,
      operationalStatus: "PLANNED",
      recordingAt: null,
      publishAt: null,
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-12T10:00:00.000Z"),
      updatedAt: new Date("2026-07-12T10:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await youtubeContentService.update("social-id", "youtube-id", {
      script: " Roteiro principal do video ",
      ownerRole: " Social Media ",
      operationalStatus: "SCRIPTING",
      recordingAt: "2026-07-21T13:00:00.000Z",
      publishAt: "2026-07-23T18:00:00.000Z"
    });

    expect(youtubeContentModel.updateOne).toHaveBeenCalledWith(
      { _id: "youtube-id" },
      {
        $set: {
          script: "Roteiro principal do video",
          ownerRole: "Social Media",
          operationalStatus: "SCRIPTING",
          recordingAt: new Date("2026-07-21T13:00:00.000Z"),
          publishAt: new Date("2026-07-23T18:00:00.000Z"),
          updatedBy: "social-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "YOUTUBE_CONTENT_UPDATED",
      targetType: "YOUTUBE_CONTENT",
      targetId: "youtube-id",
      context: {
        launchId: "launch-id",
        editorialLineVersion: 3,
        previousOperationalStatus: "PLANNED",
        operationalStatus: "SCRIPTING",
        ownerRole: "Social Media",
        recordingAt: new Date("2026-07-21T13:00:00.000Z"),
        publishAt: new Date("2026-07-23T18:00:00.000Z")
      }
    });
    expect(result.operationalStatus).toBe("SCRIPTING");
  });

  it("deactivates youtube content logically", async () => {
    youtubeContentModel.findById.mockResolvedValue({
      id: "youtube-id",
      launchId: "launch-id",
      editorialLineVersion: 3,
      theme: "Video de abertura",
      objective: "Gerar autoridade",
      format: "Aula",
      cta: "Comente eu quero",
      script: null,
      ownerRole: null,
      operationalStatus: "PLANNED",
      recordingAt: null,
      publishAt: null,
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-12T10:00:00.000Z"),
      updatedAt: new Date("2026-07-12T10:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await youtubeContentService.deactivate("social-id", "youtube-id");

    expect(youtubeContentModel.updateOne).toHaveBeenCalledWith(
      { _id: "youtube-id" },
      {
        $set: {
          active: false,
          deactivatedAt: expect.any(Date),
          updatedBy: "social-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "YOUTUBE_CONTENT_DEACTIVATED",
      targetType: "YOUTUBE_CONTENT",
      targetId: "youtube-id",
      context: {
        launchId: "launch-id",
        editorialLineVersion: 3,
        operationalStatus: "PLANNED"
      }
    });
    expect(result.active).toBe(false);
  });

  it("rejects creation without a current editorial line", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id"
    });
    editorialLineModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(null)
    });

    await expect(
      youtubeContentService.create("social-id", {
        launchId: "launch-id",
        theme: "Video de abertura",
        objective: "Gerar autoridade",
        format: "Aula",
        cta: "Comente eu quero"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "YouTube content requires an editorial line"
    });
  });
});

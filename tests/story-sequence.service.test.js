import { beforeEach, describe, expect, it, vi } from "vitest";

const storySequenceModel = {
  create: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const smartScheduleModel = {
  findById: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/story-sequence.model.js", () => ({
  StorySequence: storySequenceModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/smart-schedule.model.js", () => ({
  SmartSchedule: smartScheduleModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { storySequenceService } = await import("../src/services/story-sequence.service.js");

describe("storySequenceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    storySequenceModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    launchModel.findById.mockResolvedValue(null);
    smartScheduleModel.findById.mockResolvedValue(null);
  });

  it("creates a story sequence with valid smart schedule context", async () => {
    smartScheduleModel.findById.mockResolvedValue({
      id: "schedule-id",
      launchId: "launch-id"
    });
    storySequenceModel.create.mockResolvedValue({
      id: "sequence-id",
      launchId: "launch-id",
      smartScheduleId: "schedule-id",
      theme: "Tema diario",
      objective: "Engajamento",
      cta: "Responder a enquete",
      blocksCount: 3,
      blocks: [
        { id: "block-1", order: 1, text: "Bloco 1" },
        { id: "block-2", order: 2, text: "Bloco 2" }
      ],
      operationalStatus: "DRAFT",
      ownerRole: "SOCIAL_MEDIA",
      publishAt: new Date("2026-07-22T12:00:00.000Z"),
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await storySequenceService.create("social-id", {
      smartScheduleId: "schedule-id",
      theme: " Tema diario ",
      objective: " Engajamento ",
      cta: " Responder a enquete ",
      blocksCount: 3,
      blocks: [
        { text: " Bloco 1 " },
        { text: " Bloco 2 " }
      ],
      operationalStatus: "DRAFT",
      ownerRole: "SOCIAL_MEDIA",
      publishAt: "2026-07-22T12:00:00.000Z"
    });

    expect(storySequenceModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      smartScheduleId: "schedule-id",
      theme: "Tema diario",
      objective: "Engajamento",
      cta: "Responder a enquete",
      blocksCount: 3,
      blocks: [
        { order: 1, text: "Bloco 1" },
        { order: 2, text: "Bloco 2" }
      ],
      operationalStatus: "DRAFT",
      ownerRole: "SOCIAL_MEDIA",
      publishAt: new Date("2026-07-22T12:00:00.000Z"),
      active: true,
      createdBy: "social-id",
      updatedBy: "social-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "STORY_SEQUENCE_CREATED",
      targetType: "STORY_SEQUENCE",
      targetId: "sequence-id",
      context: {
        launchId: "launch-id",
        smartScheduleId: "schedule-id",
        blocksCount: 3,
        operationalStatus: "DRAFT"
      }
    });
    expect(result.publishAt).toEqual(new Date("2026-07-22T12:00:00.000Z"));
  });

  it("updates base text, order and status with audit", async () => {
    storySequenceModel.findById.mockResolvedValue({
      id: "sequence-id",
      launchId: "launch-id",
      smartScheduleId: "schedule-id",
      theme: "Tema diario",
      objective: "Engajamento",
      cta: "Responder a enquete",
      blocksCount: 2,
      blocks: [{ id: "block-1", order: 1, text: "Bloco antigo" }],
      operationalStatus: "DRAFT",
      ownerRole: "SOCIAL_MEDIA",
      publishAt: null,
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await storySequenceService.update("social-id", "sequence-id", {
      blocksCount: 2,
      blocks: [
        { order: 1, text: " Bloco novo 1 " },
        { order: 2, text: " Bloco novo 2 " }
      ],
      operationalStatus: "IN_REVIEW",
      ownerRole: "OPERATIONS",
      publishAt: "2026-07-23T15:00:00.000Z"
    });

    expect(storySequenceModel.updateOne).toHaveBeenCalledWith(
      { _id: "sequence-id" },
      {
        $set: {
          blocks: [
            { order: 1, text: "Bloco novo 1" },
            { order: 2, text: "Bloco novo 2" }
          ],
          blocksCount: 2,
          operationalStatus: "IN_REVIEW",
          ownerRole: "OPERATIONS",
          publishAt: new Date("2026-07-23T15:00:00.000Z"),
          updatedBy: "social-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "STORY_SEQUENCE_UPDATED",
      targetType: "STORY_SEQUENCE",
      targetId: "sequence-id",
      context: {
        launchId: "launch-id",
        previousOperationalStatus: "DRAFT",
        operationalStatus: "IN_REVIEW",
        blocksCount: 2,
        publishAt: new Date("2026-07-23T15:00:00.000Z")
      }
    });
    expect(result.operationalStatus).toBe("IN_REVIEW");
    expect(result.ownerRole).toBe("OPERATIONS");
  });

  it("rejects sequence without objective", async () => {
    await expect(
      storySequenceService.create("social-id", {
        launchId: "launch-id",
        theme: "Tema",
        objective: " ",
        cta: "CTA",
        blocksCount: 2,
        blocks: [],
        operationalStatus: "DRAFT"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Story sequence requires objective"
    });
  });

  it("rejects sequence without launch or smart schedule context", async () => {
    await expect(
      storySequenceService.create("social-id", {
        theme: "Tema",
        objective: "Engajamento",
        cta: "CTA",
        blocksCount: 2,
        blocks: [],
        operationalStatus: "DRAFT"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Story sequence requires a launch or smart schedule context"
    });
  });
});

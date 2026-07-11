import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const competitorResearchModel = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/competitor-research.model.js", () => ({
  CompetitorResearch: competitorResearchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { competitorResearchService } = await import("../src/services/competitor-research.service.js");

describe("competitorResearchService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("creates a competitor research entry linked to the launch", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    competitorResearchModel.findOne.mockResolvedValue(null);
    competitorResearchModel.create.mockResolvedValue({
      id: "competitor-id",
      launchId: "launch-id",
      competitorName: "Concorrente X",
      evidences: [
        {
          id: "evidence-id",
          channel: "Instagram",
          headline: "Headline forte",
          promise: "Promessa forte",
          trigger: "Escassez",
          observations: "Observacoes relevantes",
          capturedAt: new Date("2026-07-11T15:00:00.000Z"),
          createdBy: "strategist-id",
          updatedBy: "strategist-id"
        }
      ],
      active: true,
      createdAt: new Date("2026-07-11T15:00:00.000Z"),
      updatedAt: new Date("2026-07-11T15:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await competitorResearchService.create("strategist-id", "launch-id", {
      competitorName: " Concorrente X ",
      channel: " Instagram ",
      headline: " Headline forte ",
      promise: " Promessa forte ",
      trigger: " Escassez ",
      observations: " Observacoes relevantes ",
      capturedAt: "2026-07-11T15:00:00.000Z"
    });

    expect(competitorResearchModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      competitorName: "Concorrente X",
      evidences: [
        {
          channel: "Instagram",
          headline: "Headline forte",
          promise: "Promessa forte",
          trigger: "Escassez",
          observations: "Observacoes relevantes",
          capturedAt: new Date("2026-07-11T15:00:00.000Z"),
          createdBy: "strategist-id",
          updatedBy: "strategist-id"
        }
      ],
      active: true,
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "COMPETITOR_RESEARCH_CREATED",
      targetType: "COMPETITOR_RESEARCH",
      targetId: "competitor-id",
      context: {
        launchId: "launch-id",
        competitorName: "Concorrente X",
        channel: "Instagram"
      }
    });
    expect(result.competitorName).toBe("Concorrente X");
    expect(result.evidences).toHaveLength(1);
  });

  it("adds a new evidence to an existing competitor research entry", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    const save = vi.fn().mockResolvedValue(undefined);
    competitorResearchModel.findOne.mockResolvedValue({
      id: "competitor-id",
      launchId: "launch-id",
      competitorName: "Concorrente X",
      evidences: [],
      updatedBy: null,
      save,
      createdAt: new Date("2026-07-11T15:00:00.000Z"),
      updatedAt: new Date("2026-07-11T16:00:00.000Z"),
      createdBy: "strategist-id"
    });

    const result = await competitorResearchService.create("strategist-id", "launch-id", {
      competitorName: "Concorrente X",
      channel: "YouTube",
      headline: "Headline nova",
      promise: "Promessa nova",
      trigger: "Autoridade",
      observations: "Video de prova social",
      capturedAt: "2026-07-11T16:00:00.000Z"
    });

    expect(save).toHaveBeenCalled();
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "COMPETITOR_RESEARCH_EVIDENCE_ADDED",
      targetType: "COMPETITOR_RESEARCH",
      targetId: "competitor-id",
      context: {
        launchId: "launch-id",
        competitorName: "Concorrente X",
        channel: "YouTube"
      }
    });
    expect(result.evidences).toHaveLength(1);
    expect(result.evidences[0]).toEqual(
      expect.objectContaining({
        channel: "YouTube",
        headline: "Headline nova"
      })
    );
  });

  it("rejects creation when the launch does not exist", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      competitorResearchService.create("strategist-id", "launch-id", {
        competitorName: "Concorrente X",
        channel: "Instagram",
        headline: "Headline",
        promise: "Promessa",
        trigger: "Escassez",
        observations: "Observacoes",
        capturedAt: "2026-07-11T15:00:00.000Z"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });
});

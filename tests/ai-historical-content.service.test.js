import { beforeEach, describe, expect, it, vi } from "vitest";

const historicalContentModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};
const launchModel = { findById: vi.fn() };
const auditServiceMock = { record: vi.fn() };

vi.mock("../src/models/ai-historical-content.model.js", () => ({
  AiHistoricalContent: historicalContentModel,
  historicalContentFormats: ["REEL", "CAROUSEL", "EMAIL"],
  historicalContentOrigins: ["ORIGINAL", "REUSED"]
}));
vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));

const { aiHistoricalContentService } = await import("../src/services/ai-historical-content.service.js");

function queryMock(value) {
  return {
    sort: vi.fn().mockResolvedValue(value)
  };
}

function buildHistoricalContent(overrides = {}) {
  return {
    id: "content-id",
    launchId: "launch-id",
    title: "Reel de aquecimento validado",
    format: "REEL",
    objective: "Aquecer leads para oferta",
    summary: "Conteudo historico com alto engajamento.",
    tags: ["aquecimento", "oferta"],
    origin: "ORIGINAL",
    reusedFromContentId: null,
    performance: {
      views: 10000,
      clicks: 900,
      conversions: 120,
      revenue: 24000,
      engagementRate: 0.18,
      score: 92
    },
    sensitiveNotes: "Nunca expor este detalhe interno.",
    active: true,
    deactivatedAt: null,
    createdAt: new Date("2026-07-12T12:00:00.000Z"),
    updatedAt: new Date("2026-07-12T12:00:00.000Z"),
    createdBy: "strategist-id",
    updatedBy: "strategist-id",
    toObject() {
      return { ...this };
    },
    ...overrides
  };
}

describe("aiHistoricalContentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Premium",
      product: "Programa JL",
      active: true
    });
  });

  it("creates historical content without exposing sensitive notes", async () => {
    historicalContentModel.create.mockResolvedValue(buildHistoricalContent());

    const result = await aiHistoricalContentService.create("strategist-id", {
      launchId: "launch-id",
      title: " Reel de aquecimento validado ",
      format: "REEL",
      objective: " Aquecer leads para oferta ",
      summary: " Conteudo historico com alto engajamento. ",
      tags: ["aquecimento", "oferta", "aquecimento"],
      origin: "ORIGINAL",
      performance: {
        views: 10000,
        clicks: 900,
        conversions: 120,
        revenue: 24000,
        engagementRate: 0.18,
        score: 92
      },
      sensitiveNotes: "Nunca expor este detalhe interno."
    });

    expect(historicalContentModel.create).toHaveBeenCalledWith(expect.objectContaining({
      title: "Reel de aquecimento validado",
      objective: "Aquecer leads para oferta",
      summary: "Conteudo historico com alto engajamento.",
      tags: ["aquecimento", "oferta"],
      active: true,
      createdBy: "strategist-id"
    }));
    expect(result).not.toHaveProperty("sensitiveNotes");
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_HISTORICAL_CONTENT_CREATED",
      targetType: "AI_HISTORICAL_CONTENT",
      targetId: "content-id"
    }));
  });

  it("lists relevant historical contents by filters ordered by performance", async () => {
    historicalContentModel.find.mockReturnValue(queryMock([buildHistoricalContent()]));

    const result = await aiHistoricalContentService.list("strategist-id", {
      launchId: "launch-id",
      format: "REEL",
      objective: "oferta",
      tags: ["aquecimento"]
    });

    expect(historicalContentModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      format: "REEL",
      objective: expect.any(RegExp),
      tags: { $in: ["aquecimento"] },
      active: true
    });
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("sensitiveNotes");
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_HISTORICAL_CONTENT_SEARCHED",
      context: expect.objectContaining({ results: 1 })
    }));
  });

  it("recommends reusable correlated contents for a planned launch", async () => {
    historicalContentModel.find.mockReturnValue(queryMock([
      buildHistoricalContent({
        id: "reused-content-id",
        origin: "REUSED",
        reusedFromContentId: "content-id",
        tags: ["oferta", "escassez"],
        performance: {
          views: 7000,
          clicks: 700,
          conversions: 90,
          revenue: 18000,
          engagementRate: 0.15,
          score: 84
        }
      }),
      buildHistoricalContent()
    ]));

    const result = await aiHistoricalContentService.recommend("strategist-id", {
      launchId: "launch-id",
      objective: "oferta",
      format: "REEL",
      tags: ["oferta"],
      limit: 2
    });

    expect(launchModel.findById).toHaveBeenCalledWith("launch-id");
    expect(historicalContentModel.find).toHaveBeenCalledWith({
      format: "REEL",
      objective: expect.any(RegExp),
      tags: { $in: ["oferta"] },
      active: true
    });
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0]).toHaveProperty("correlationScore");
    expect(result.recommendations.map((recommendation) => recommendation.reuseType)).toContain("REUSE_CHAIN");
    expect(result.recommendations.map((recommendation) => recommendation.reuseType)).toContain("ADAPT_ORIGINAL");
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_HISTORICAL_CONTENT_RECOMMENDED",
      targetType: "LAUNCH",
      targetId: "launch-id"
    }));
  });

  it("logically deactivates historical content", async () => {
    historicalContentModel.findById.mockResolvedValue(buildHistoricalContent());
    historicalContentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const result = await aiHistoricalContentService.deactivate("admin-id", "content-id");

    expect(historicalContentModel.updateOne).toHaveBeenCalledWith(
      { _id: "content-id" },
      {
        $set: {
          active: false,
          deactivatedAt: expect.any(Date),
          updatedBy: "admin-id"
        }
      }
    );
    expect(result.active).toBe(false);
    expect(result).not.toHaveProperty("sensitiveNotes");
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_HISTORICAL_CONTENT_DEACTIVATED"
    }));
  });
});

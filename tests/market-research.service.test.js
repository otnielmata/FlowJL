import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const marketResearchModel = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

const marketResearchGeneratorServiceMock = {
  generate: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/market-research.model.js", () => ({
  MarketResearch: marketResearchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

vi.mock("../src/services/market-research-generator.service.js", () => ({
  marketResearchGeneratorService: marketResearchGeneratorServiceMock
}));

const { marketResearchService } = await import("../src/services/market-research.service.js");

describe("marketResearchService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("creates a versioned market research entry linked to an existing launch", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Expert X",
      expert: "Expert X",
      product: "Produto Y"
    });
    marketResearchModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 2 })
    });
    marketResearchGeneratorServiceMock.generate.mockReturnValue({
      themes: [{ title: "Tema 1", rationale: "Base racional 1" }],
      promises: [{ title: "Promessa 1", rationale: "Base racional 2" }],
      objections: [{ title: "Objecao 1", rebuttal: "Resposta 1" }],
      ctas: ["CTA 1"],
      suggestedFormats: [{ type: "carrossel", angle: "Angulo 1" }]
    });
    marketResearchModel.create.mockResolvedValue({
      id: "research-id",
      launchId: "launch-id",
      version: 3,
      briefing: "Briefing estruturado para o lancamento.",
      objective: "Aumentar volume de leads.",
      productContext: "Produto de mentoria para experts digitais.",
      themes: [{ title: "Tema 1", rationale: "Base racional 1" }],
      promises: [{ title: "Promessa 1", rationale: "Base racional 2" }],
      objections: [{ title: "Objecao 1", rebuttal: "Resposta 1" }],
      ctas: ["CTA 1"],
      suggestedFormats: [{ type: "carrossel", angle: "Angulo 1" }],
      humanReviewRequired: true,
      createdAt: new Date("2026-07-11T12:30:00.000Z"),
      updatedAt: new Date("2026-07-11T12:30:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await marketResearchService.create("strategist-id", "launch-id", {
      briefing: " Briefing estruturado para o lancamento. ",
      objective: " Aumentar volume de leads. ",
      productContext: " Produto de mentoria para experts digitais. "
    });

    expect(launchModel.findById).toHaveBeenCalledWith("launch-id");
    expect(marketResearchModel.findOne).toHaveBeenCalledWith({ launchId: "launch-id" });
    expect(marketResearchGeneratorServiceMock.generate).toHaveBeenCalledWith({
      launch: {
        id: "launch-id",
        name: "Lancamento Expert X",
        expert: "Expert X",
        product: "Produto Y"
      },
      briefing: "Briefing estruturado para o lancamento.",
      objective: "Aumentar volume de leads.",
      productContext: "Produto de mentoria para experts digitais."
    });
    expect(marketResearchModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      version: 3,
      briefing: "Briefing estruturado para o lancamento.",
      objective: "Aumentar volume de leads.",
      productContext: "Produto de mentoria para experts digitais.",
      themes: [{ title: "Tema 1", rationale: "Base racional 1" }],
      promises: [{ title: "Promessa 1", rationale: "Base racional 2" }],
      objections: [{ title: "Objecao 1", rebuttal: "Resposta 1" }],
      ctas: ["CTA 1"],
      suggestedFormats: [{ type: "carrossel", angle: "Angulo 1" }],
      humanReviewRequired: true,
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "MARKET_RESEARCH_GENERATED",
      targetType: "MARKET_RESEARCH",
      targetId: "research-id",
      context: {
        launchId: "launch-id",
        version: 3
      }
    });
    expect(result).toEqual({
      id: "research-id",
      launchId: "launch-id",
      version: 3,
      briefing: "Briefing estruturado para o lancamento.",
      objective: "Aumentar volume de leads.",
      productContext: "Produto de mentoria para experts digitais.",
      themes: [{ title: "Tema 1", rationale: "Base racional 1" }],
      promises: [{ title: "Promessa 1", rationale: "Base racional 2" }],
      objections: [{ title: "Objecao 1", rebuttal: "Resposta 1" }],
      ctas: ["CTA 1"],
      suggestedFormats: [{ type: "carrossel", angle: "Angulo 1" }],
      humanReviewRequired: true,
      createdAt: new Date("2026-07-11T12:30:00.000Z"),
      updatedAt: new Date("2026-07-11T12:30:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });
  });

  it("rejects research generation when the launch does not exist", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      marketResearchService.create("strategist-id", "launch-id", {
        briefing: "Briefing estruturado para o lancamento.",
        objective: "Aumentar volume de leads.",
        productContext: "Produto de mentoria para experts digitais."
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });
});

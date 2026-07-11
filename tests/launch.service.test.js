import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findOne: vi.fn(),
  create: vi.fn(),
  findById: vi.fn()
};

const marketResearchModel = {
  find: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
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

const { launchService } = await import("../src/services/launch.service.js");

describe("launchService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("creates a launch with UUID id and UTC milestone period", async () => {
    launchModel.findOne.mockResolvedValue(null);
    launchModel.create.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Expert X",
      expert: "Expert X",
      product: "Produto Y",
      baseDate: new Date("2026-08-01T00:00:00.000Z"),
      periodStart: new Date("2026-08-05T12:00:00.000Z"),
      periodEnd: new Date("2026-08-20T15:30:00.000Z"),
      milestones: [
        { name: "Aquecimento", scheduledAt: new Date("2026-08-05T12:00:00.000Z") },
        { name: "Carrinho", scheduledAt: new Date("2026-08-20T15:30:00.000Z") }
      ],
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await launchService.create("strategist-id", {
      name: " Lancamento Expert X ",
      expert: " Expert X ",
      product: " Produto Y ",
      baseDate: "2026-08-01T00:00:00.000Z",
      milestones: [
        { name: " Aquecimento ", scheduledAt: "2026-08-05T12:00:00.000Z" },
        { name: " Carrinho ", scheduledAt: "2026-08-20T15:30:00.000Z" }
      ]
    });

    expect(launchModel.findOne).toHaveBeenCalledWith({
      name: "Lancamento Expert X",
      product: "Produto Y",
      periodStart: new Date("2026-08-05T12:00:00.000Z"),
      periodEnd: new Date("2026-08-20T15:30:00.000Z"),
      active: true
    });
    expect(launchModel.create).toHaveBeenCalledWith({
      name: "Lancamento Expert X",
      expert: "Expert X",
      product: "Produto Y",
      baseDate: new Date("2026-08-01T00:00:00.000Z"),
      periodStart: new Date("2026-08-05T12:00:00.000Z"),
      periodEnd: new Date("2026-08-20T15:30:00.000Z"),
      milestones: [
        { name: "Aquecimento", scheduledAt: new Date("2026-08-05T12:00:00.000Z") },
        { name: "Carrinho", scheduledAt: new Date("2026-08-20T15:30:00.000Z") }
      ],
      active: true,
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "LAUNCH_CREATED",
      targetType: "LAUNCH",
      targetId: "launch-id",
      context: {
        product: "Produto Y",
        expert: "Expert X",
        baseDate: "2026-08-01T00:00:00.000Z"
      }
    });
    expect(result).toEqual({
      id: "launch-id",
      name: "Lancamento Expert X",
      expert: "Expert X",
      product: "Produto Y",
      baseDate: new Date("2026-08-01T00:00:00.000Z"),
      periodStart: new Date("2026-08-05T12:00:00.000Z"),
      periodEnd: new Date("2026-08-20T15:30:00.000Z"),
      milestones: [
        { name: "Aquecimento", scheduledAt: new Date("2026-08-05T12:00:00.000Z") },
        { name: "Carrinho", scheduledAt: new Date("2026-08-20T15:30:00.000Z") }
      ],
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });
  });

  it("rejects an incompatible active duplicate launch", async () => {
    launchModel.findOne.mockResolvedValue({ id: "launch-existing" });

    await expect(
      launchService.create("strategist-id", {
        name: "Lancamento Expert X",
        expert: "Expert X",
        product: "Produto Y",
        baseDate: "2026-08-01T00:00:00.000Z",
        milestones: [{ name: "Aquecimento", scheduledAt: "2026-08-05T12:00:00.000Z" }]
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "An active launch with the same name, product and period already exists"
    });
  });

  it("returns the launch with its market research history", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Expert X",
      expert: "Expert X",
      product: "Produto Y",
      baseDate: new Date("2026-08-01T00:00:00.000Z"),
      periodStart: new Date("2026-08-05T12:00:00.000Z"),
      periodEnd: new Date("2026-08-20T15:30:00.000Z"),
      milestones: [
        { name: "Aquecimento", scheduledAt: new Date("2026-08-05T12:00:00.000Z") }
      ],
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });
    marketResearchModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "research-id",
          version: 2,
          briefing: "Briefing estruturado",
          objective: "Aumentar leads",
          productContext: "Produto com foco em conversao",
          themes: [{ title: "Tema 1", rationale: "Base racional" }],
          promises: [{ title: "Promessa 1", rationale: "Base racional" }],
          objections: [{ title: "Objecao 1", rebuttal: "Resposta 1" }],
          ctas: ["CTA 1"],
          suggestedFormats: [{ type: "carrossel", angle: "Angulo 1" }],
          humanReviewRequired: true,
          createdAt: new Date("2026-07-11T12:30:00.000Z"),
          updatedAt: new Date("2026-07-11T12:30:00.000Z"),
          createdBy: "strategist-id",
          updatedBy: "strategist-id"
        }
      ])
    });

    const result = await launchService.getById("launch-id");

    expect(launchModel.findById).toHaveBeenCalledWith("launch-id");
    expect(marketResearchModel.find).toHaveBeenCalledWith({ launchId: "launch-id" });
    expect(result.marketResearchHistory).toEqual([
      {
        id: "research-id",
        version: 2,
        briefing: "Briefing estruturado",
        objective: "Aumentar leads",
        productContext: "Produto com foco em conversao",
        themes: [{ title: "Tema 1", rationale: "Base racional" }],
        promises: [{ title: "Promessa 1", rationale: "Base racional" }],
        objections: [{ title: "Objecao 1", rebuttal: "Resposta 1" }],
        ctas: ["CTA 1"],
        suggestedFormats: [{ type: "carrossel", angle: "Angulo 1" }],
        humanReviewRequired: true,
        createdAt: new Date("2026-07-11T12:30:00.000Z"),
        updatedAt: new Date("2026-07-11T12:30:00.000Z"),
        createdBy: "strategist-id",
        updatedBy: "strategist-id"
      }
    ]);
  });

  it("rejects launch lookup when the launch does not exist", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(launchService.getById("launch-id")).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });
});

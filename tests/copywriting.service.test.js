import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const offerModel = {
  findOne: vi.fn()
};

const positioningModel = {
  findOne: vi.fn()
};

const editorialLineModel = {
  findOne: vi.fn()
};

const avatarModel = {
  findOne: vi.fn()
};

const copywritingModel = {
  create: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

const copywritingGeneratorServiceMock = {
  generate: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/offer.model.js", () => ({
  Offer: offerModel
}));

vi.mock("../src/models/positioning.model.js", () => ({
  Positioning: positioningModel
}));

vi.mock("../src/models/editorial-line.model.js", () => ({
  EditorialLine: editorialLineModel
}));

vi.mock("../src/models/avatar.model.js", () => ({
  Avatar: avatarModel
}));

vi.mock("../src/models/copywriting.model.js", () => ({
  Copywriting: copywritingModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

vi.mock("../src/services/copywriting-generator.service.js", () => ({
  copywritingGeneratorService: copywritingGeneratorServiceMock
}));

const { copywritingService } = await import("../src/services/copywriting.service.js");

describe("copywritingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("generates structured copy with launch strategic context", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Premium",
      expert: "Ana Costa",
      product: "Programa Escala Digital"
    });
    offerModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        version: 2,
        promise: "Implementar um metodo comercial lucrativo"
      })
    });
    positioningModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        version: 4,
        centralPromise: "crescimento previsivel com metodo"
      })
    });
    editorialLineModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        version: 3,
        pillars: [{ name: "Autoridade", active: true }, { name: "Bastidores", active: false }]
      })
    });
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        version: 1,
        language: ["direto ao ponto", "sem jargao"]
      })
    });
    copywritingGeneratorServiceMock.generate.mockReturnValue({
      headline: "Headline principal",
      hook: "Hook principal",
      bodySections: [{ label: "Abertura", content: "Conteudo base" }],
      cta: "Clique e avance",
      reviewNotes: ["Revisar tom"]
    });

    const result = await copywritingService.generate("strategist-id", "launch-id", {
      format: "EMAIL",
      objective: "Aquecer a base para a oferta",
      briefing: "Precisamos de uma copy que conecte posicionamento premium com clareza de metodo."
    });

    expect(copywritingGeneratorServiceMock.generate).toHaveBeenCalledWith({
      launch: {
        id: "launch-id",
        name: "Lancamento Premium",
        expert: "Ana Costa",
        product: "Programa Escala Digital"
      },
      format: "EMAIL",
      objective: "Aquecer a base para a oferta",
      briefing: "Precisamos de uma copy que conecte posicionamento premium com clareza de metodo.",
      sourceContext: {
        launchId: "launch-id",
        launchName: "Lancamento Premium",
        product: "Programa Escala Digital",
        expert: "Ana Costa",
        offerVersion: 2,
        positioningVersion: 4,
        editorialLineVersion: 3,
        avatarVersion: 1,
        editorialPillars: ["Autoridade"],
        languageCues: ["direto ao ponto", "sem jargao"]
      },
      positioning: {
        version: 4,
        centralPromise: "crescimento previsivel com metodo"
      },
      offer: {
        version: 2,
        promise: "Implementar um metodo comercial lucrativo"
      }
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "COPYWRITING_GENERATED",
      targetType: "LAUNCH",
      targetId: "launch-id",
      context: {
        launchId: "launch-id",
        format: "EMAIL",
        objective: "Aquecer a base para a oferta",
        offerVersion: 2,
        positioningVersion: 4
      }
    });
    expect(result.suggestion.headline).toBe("Headline principal");
    expect(result.sourceContext.offerVersion).toBe(2);
  });

  it("saves generated copy with origin context snapshot", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id"
    });
    copywritingModel.create.mockResolvedValue({
      id: "copy-id",
      launchId: "launch-id",
      format: "EMAIL",
      objective: "Aquecer a base para a oferta",
      briefing: "Briefing validado para a copy",
      headline: "Headline principal",
      hook: "Hook principal",
      bodySections: [{ label: "Abertura", content: "Conteudo base" }],
      cta: "Clique e avance",
      reviewNotes: ["Revisar tom"],
      sourceContext: {
        launchId: "launch-id",
        launchName: "Lancamento Premium",
        product: "Programa Escala Digital",
        expert: "Ana Costa",
        offerVersion: 2,
        positioningVersion: 4,
        editorialLineVersion: 3,
        avatarVersion: 1,
        editorialPillars: ["Autoridade"],
        languageCues: ["direto ao ponto"]
      },
      generatedByAI: true,
      humanReviewRequired: true,
      active: true,
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await copywritingService.create("strategist-id", {
      launchId: "launch-id",
      format: "EMAIL",
      objective: " Aquecer a base para a oferta ",
      briefing: " Briefing validado para a copy ",
      headline: " Headline principal ",
      hook: " Hook principal ",
      bodySections: [{ label: " Abertura ", content: " Conteudo base " }],
      cta: " Clique e avance ",
      reviewNotes: [" Revisar tom "],
      sourceContext: {
        launchId: "launch-id",
        launchName: "Lancamento Premium",
        product: "Programa Escala Digital",
        expert: "Ana Costa",
        offerVersion: 2,
        positioningVersion: 4,
        editorialLineVersion: 3,
        avatarVersion: 1,
        editorialPillars: ["Autoridade"],
        languageCues: ["direto ao ponto"]
      }
    });

    expect(copywritingModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      format: "EMAIL",
      objective: "Aquecer a base para a oferta",
      briefing: "Briefing validado para a copy",
      headline: "Headline principal",
      hook: "Hook principal",
      bodySections: [{ label: "Abertura", content: "Conteudo base" }],
      cta: "Clique e avance",
      reviewNotes: ["Revisar tom"],
      sourceContext: {
        launchId: "launch-id",
        launchName: "Lancamento Premium",
        product: "Programa Escala Digital",
        expert: "Ana Costa",
        offerVersion: 2,
        positioningVersion: 4,
        editorialLineVersion: 3,
        avatarVersion: 1,
        editorialPillars: ["Autoridade"],
        languageCues: ["direto ao ponto"]
      },
      generatedByAI: true,
      humanReviewRequired: true,
      active: true,
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "COPYWRITING_SAVED",
      targetType: "COPYWRITING",
      targetId: "copy-id",
      context: {
        launchId: "launch-id",
        format: "EMAIL",
        offerVersion: 2,
        positioningVersion: 4
      }
    });
    expect(result.id).toBe("copy-id");
  });

  it("rejects generation when strategic context is insufficient", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Premium",
      expert: "Ana Costa",
      product: "Programa Escala Digital"
    });
    offerModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(null)
    });
    positioningModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        version: 4,
        centralPromise: "crescimento previsivel com metodo"
      })
    });
    editorialLineModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(null)
    });
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(null)
    });

    await expect(
      copywritingService.generate("strategist-id", "launch-id", {
        format: "EMAIL",
        objective: "Aquecer a base para a oferta",
        briefing: "Precisamos de uma copy que conecte posicionamento premium com clareza de metodo."
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Copywriting generation requires current offer and positioning context"
    });
  });
});

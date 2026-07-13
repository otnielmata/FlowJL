import { beforeEach, describe, expect, it, vi } from "vitest";

const aiBrandMaterialModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn()
};
const launchModel = { findById: vi.fn() };
const avatarModel = { findOne: vi.fn() };
const editorialLineModel = { findOne: vi.fn() };
const positioningModel = { findOne: vi.fn() };
const offerModel = { findOne: vi.fn() };
const auditServiceMock = { record: vi.fn() };
const generatorMock = { generate: vi.fn() };

vi.mock("../src/models/ai-brand-material.model.js", () => ({
  AiBrandMaterial: aiBrandMaterialModel,
  aiBrandMaterialTypes: ["SCRIPT", "COPY", "EMAIL"],
  aiBrandMaterialReviewStatuses: ["PENDING_REVIEW", "APPROVED", "REJECTED"]
}));
vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/models/avatar.model.js", () => ({ Avatar: avatarModel }));
vi.mock("../src/models/editorial-line.model.js", () => ({ EditorialLine: editorialLineModel }));
vi.mock("../src/models/positioning.model.js", () => ({ Positioning: positioningModel }));
vi.mock("../src/models/offer.model.js", () => ({ Offer: offerModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));
vi.mock("../src/services/ai-brand-material-generator.service.js", () => ({ aiBrandMaterialGeneratorService: generatorMock }));

const { aiBrandMaterialService } = await import("../src/services/ai-brand-material.service.js");

function queryMock(value) {
  return {
    sort: vi.fn().mockResolvedValue(value)
  };
}

function buildMaterial(overrides = {}) {
  return {
    id: "material-id",
    launchId: "launch-id",
    version: 2,
    materialType: "EMAIL",
    objective: "Aquecer base para oferta",
    briefing: "Briefing completo para gerar um e-mail com contexto de marca suficiente.",
    title: "E-mail de aquecimento",
    hook: "Hook alinhado ao estilo da marca",
    sections: [{ label: "Abertura", content: "Conteudo base" }],
    cta: "Revisar e publicar",
    reviewNotes: ["Revisar tom"],
    sourceContext: {
      launchId: "launch-id",
      launchName: "Lancamento Premium",
      product: "Programa JL",
      expert: "Ana Costa",
      avatarVersion: 1,
      editorialLineVersion: 3,
      positioningVersion: 4,
      offerVersion: 2,
      editorialPillars: ["Autoridade"],
      languageCues: ["direto ao ponto"],
      brandSignals: ["crescimento previsivel"]
    },
    generatedByAI: true,
    humanReviewRequired: true,
    reviewStatus: "PENDING_REVIEW",
    active: true,
    createdAt: new Date("2026-07-12T12:00:00.000Z"),
    updatedAt: new Date("2026-07-12T12:00:00.000Z"),
    createdBy: "strategist-id",
    updatedBy: "strategist-id",
    ...overrides
  };
}

describe("aiBrandMaterialService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Premium",
      product: "Programa JL",
      expert: "Ana Costa",
      active: true
    });
    avatarModel.findOne.mockReturnValue(queryMock({ version: 1, language: ["direto ao ponto"] }));
    editorialLineModel.findOne.mockReturnValue(queryMock({ version: 3, pillars: [{ name: "Autoridade", active: true }] }));
    positioningModel.findOne.mockReturnValue(queryMock({
      version: 4,
      centralPromise: "crescimento previsivel",
      differentiators: ["metodo JL"]
    }));
    offerModel.findOne.mockReturnValue(queryMock({ version: 2, promise: "vender com consistencia" }));
  });

  it("generates brand-aligned material with safe source context and audit trail", async () => {
    generatorMock.generate.mockReturnValue({
      title: "E-mail de aquecimento",
      hook: "Hook alinhado",
      sections: [{ label: "Abertura", content: "Conteudo base" }],
      cta: "Revisar e publicar",
      reviewNotes: ["Revisar tom"]
    });

    const result = await aiBrandMaterialService.generate("strategist-id", "launch-id", {
      materialType: "EMAIL",
      objective: "Aquecer base para oferta",
      briefing: "Briefing completo para gerar um e-mail com contexto de marca suficiente."
    });

    expect(generatorMock.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        materialType: "EMAIL",
        objective: "Aquecer base para oferta",
        sourceContext: expect.objectContaining({
          avatarVersion: 1,
          editorialLineVersion: 3,
          positioningVersion: 4,
          languageCues: ["direto ao ponto"],
          brandSignals: ["crescimento previsivel", "metodo JL", "vender com consistencia"]
        })
      })
    );
    expect(result).not.toHaveProperty("prompt");
    expect(result.humanReviewRequired).toBe(true);
    expect(auditServiceMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "AI_BRAND_MATERIAL_GENERATED",
        targetType: "LAUNCH",
        targetId: "launch-id"
      })
    );
  });

  it("rejects generation without current brand identity context", async () => {
    avatarModel.findOne.mockReturnValue(queryMock(null));

    await expect(
      aiBrandMaterialService.generate("strategist-id", "launch-id", {
        materialType: "SCRIPT",
        objective: "Gerar roteiro de venda",
        briefing: "Briefing completo para testar a geracao com contexto suficiente."
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "AI brand material generation requires current avatar, editorial line and positioning context"
    });
  });

  it("saves generated material as a new reviewable version", async () => {
    aiBrandMaterialModel.findOne.mockReturnValue(queryMock({ version: 1 }));
    aiBrandMaterialModel.create.mockResolvedValue(buildMaterial());

    const result = await aiBrandMaterialService.create("strategist-id", buildMaterial({ version: undefined }));

    expect(aiBrandMaterialModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-id",
        version: 2,
        materialType: "EMAIL",
        generatedByAI: true,
        humanReviewRequired: true,
        reviewStatus: "PENDING_REVIEW",
        active: true
      })
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "AI_BRAND_MATERIAL_SAVED",
      targetType: "AI_BRAND_MATERIAL",
      targetId: "material-id",
      context: {
        launchId: "launch-id",
        materialType: "EMAIL",
        version: 2,
        reviewStatus: "PENDING_REVIEW"
      }
    });
    expect(result.version).toBe(2);
  });

  it("lists and retrieves saved AI brand materials", async () => {
    aiBrandMaterialModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildMaterial()])
    });
    aiBrandMaterialModel.findById.mockResolvedValue(buildMaterial());

    const listResult = await aiBrandMaterialService.list({ launchId: "launch-id", materialType: "EMAIL", reviewStatus: "PENDING_REVIEW" });
    const getResult = await aiBrandMaterialService.getById("material-id");

    expect(aiBrandMaterialModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      materialType: "EMAIL",
      reviewStatus: "PENDING_REVIEW",
      active: true
    });
    expect(listResult).toHaveLength(1);
    expect(getResult.id).toBe("material-id");
  });
});

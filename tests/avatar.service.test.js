import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const avatarModel = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn()
};

const marketResearchModel = {
  find: vi.fn()
};

const competitorResearchModel = {
  find: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

const avatarGeneratorServiceMock = {
  generate: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/avatar.model.js", () => ({
  Avatar: avatarModel
}));

vi.mock("../src/models/market-research.model.js", () => ({
  MarketResearch: marketResearchModel
}));

vi.mock("../src/models/competitor-research.model.js", () => ({
  CompetitorResearch: competitorResearchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

vi.mock("../src/services/avatar-generator.service.js", () => ({
  avatarGeneratorService: avatarGeneratorServiceMock
}));

const { avatarService } = await import("../src/services/avatar.service.js");

describe("avatarService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("creates the first primary avatar for the launch", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(null)
    });
    avatarModel.create.mockResolvedValue({
      id: "avatar-id",
      launchId: "launch-id",
      version: 1,
      profile: "Perfil do publico",
      pains: ["Dor 1"],
      dreams: ["Sonho 1"],
      objections: ["Objecao 1"],
      language: ["Linguagem 1"],
      isPrimary: true,
      isCurrent: true,
      humanReviewRequired: true,
      aiSuggestions: {
        profileAngles: [],
        painAmplifiers: [],
        dreamDrivers: [],
        languageCues: []
      },
      createdAt: new Date("2026-07-11T18:00:00.000Z"),
      updatedAt: new Date("2026-07-11T18:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await avatarService.create("strategist-id", "launch-id", {
      profile: " Perfil do publico ",
      pains: [" Dor 1 "],
      dreams: [" Sonho 1 "],
      objections: [" Objecao 1 "],
      language: [" Linguagem 1 "]
    });

    expect(avatarModel.create).toHaveBeenCalledWith(expect.objectContaining({
      launchId: "launch-id",
      version: 1,
      isPrimary: true,
      isCurrent: true
    }));
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "strategist-id",
      action: "AVATAR_CREATED",
      targetType: "AVATAR",
      targetId: "avatar-id",
      context: {
        launchId: "launch-id",
        version: 1
      }
    });
    expect(result.version).toBe(1);
  });

  it("creates a new version when updating the current avatar", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        id: "avatar-v1",
        version: 1,
        isPrimary: true,
        aiSuggestions: {
          profileAngles: [],
          painAmplifiers: [],
          dreamDrivers: [],
          languageCues: []
        },
        createdBy: "strategist-id"
      })
    });
    avatarModel.updateOne.mockResolvedValue(undefined);
    avatarModel.create.mockResolvedValue({
      id: "avatar-v2",
      launchId: "launch-id",
      version: 2,
      profile: "Perfil atualizado",
      pains: ["Dor 2"],
      dreams: ["Sonho 2"],
      objections: ["Objecao 2"],
      language: ["Linguagem 2"],
      isPrimary: true,
      isCurrent: true,
      humanReviewRequired: true,
      aiSuggestions: {
        profileAngles: [],
        painAmplifiers: [],
        dreamDrivers: [],
        languageCues: []
      },
      createdAt: new Date("2026-07-11T18:30:00.000Z"),
      updatedAt: new Date("2026-07-11T18:30:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await avatarService.update("strategist-id", "launch-id", {
      profile: "Perfil atualizado",
      pains: ["Dor 2"],
      dreams: ["Sonho 2"],
      objections: ["Objecao 2"],
      language: ["Linguagem 2"]
    });

    expect(avatarModel.updateOne).toHaveBeenCalledWith(
      { _id: "avatar-v1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          isCurrent: false,
          updatedBy: "strategist-id"
        })
      })
    );
    expect(result.version).toBe(2);
  });

  it("returns avatar suggestions with human review flag", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento",
      product: "Produto",
      expert: "Expert"
    });
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        version: 2,
        profile: "Perfil atual",
        pains: ["Dor atual"],
        dreams: ["Sonho atual"],
        objections: ["Objecao atual"]
      })
    });
    marketResearchModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([])
    });
    competitorResearchModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([])
    });
    avatarGeneratorServiceMock.generate.mockReturnValue({
      profileAngles: [{ title: "Perfil 1", rationale: "Base 1" }],
      painAmplifiers: [{ title: "Dor 1", rationale: "Base 2" }],
      dreamDrivers: [{ title: "Sonho 1", rationale: "Base 3" }],
      languageCues: [{ title: "Linguagem 1", rationale: "Base 4" }],
      humanReviewRequired: true
    });

    const result = await avatarService.suggest("launch-id");

    expect(result).toEqual({
      launchId: "launch-id",
      basedOnAvatarVersion: 2,
      profileAngles: [{ title: "Perfil 1", rationale: "Base 1" }],
      painAmplifiers: [{ title: "Dor 1", rationale: "Base 2" }],
      dreamDrivers: [{ title: "Sonho 1", rationale: "Base 3" }],
      languageCues: [{ title: "Linguagem 1", rationale: "Base 4" }],
      humanReviewRequired: true
    });
  });
});

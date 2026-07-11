import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const avatarModel = {
  findOne: vi.fn()
};

const offerModel = {
  findOne: vi.fn()
};

const positioningModel = {
  findOne: vi.fn()
};

const editorialLineModel = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/avatar.model.js", () => ({
  Avatar: avatarModel
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

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { editorialLineService } = await import("../src/services/editorial-line.service.js");

describe("editorialLineService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("creates the current editorial line when strategic context exists", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    editorialLineModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue(null)
    });
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 2 })
    });
    offerModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 3 })
    });
    positioningModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 4 })
    });
    editorialLineModel.create.mockResolvedValue({
      id: "editorial-id",
      launchId: "launch-id",
      version: 1,
      pillars: [
        { id: "pillar-1", name: "Educacao", objective: "Nutrir audiencia", priority: 1, active: true }
      ],
      avatarVersion: 2,
      offerVersion: 3,
      positioningVersion: 4,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T21:00:00.000Z"),
      updatedAt: new Date("2026-07-11T21:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await editorialLineService.create("strategist-id", "launch-id", {
      pillars: [{ name: " Educacao ", objective: " Nutrir audiencia ", priority: 1 }]
    });

    expect(editorialLineModel.create).toHaveBeenCalledWith(expect.objectContaining({
      launchId: "launch-id",
      version: 1,
      avatarVersion: 2,
      offerVersion: 3,
      positioningVersion: 4
    }));
    expect(result.version).toBe(1);
  });

  it("updates the editorial line preserving history", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    editorialLineModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue({
        id: "editorial-v1",
        version: 1,
        createdBy: "strategist-id"
      })
    });
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 2 })
    });
    offerModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 3 })
    });
    positioningModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 4 })
    });
    editorialLineModel.updateOne.mockResolvedValue(undefined);
    editorialLineModel.create.mockResolvedValue({
      id: "editorial-v2",
      launchId: "launch-id",
      version: 2,
      pillars: [
        { id: "pillar-2", name: "Conversao", objective: "Gerar demanda", priority: 1, active: true },
        { id: "pillar-3", name: "Relacionamento", objective: "Aproximar publico", priority: 3, active: false }
      ],
      avatarVersion: 2,
      offerVersion: 3,
      positioningVersion: 4,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T21:10:00.000Z"),
      updatedAt: new Date("2026-07-11T21:10:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await editorialLineService.update("strategist-id", "launch-id", {
      pillars: [
        { name: "Conversao", objective: "Gerar demanda", priority: 1, active: true },
        { name: "Relacionamento", objective: "Aproximar publico", priority: 3, active: false }
      ]
    });

    expect(editorialLineModel.updateOne).toHaveBeenCalledWith(
      { _id: "editorial-v1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          isCurrent: false,
          active: false
        })
      })
    );
    expect(result.version).toBe(2);
    expect(result.pillars[1].active).toBe(false);
  });

  it("rejects creation without strategic context", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    editorialLineModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue(null)
    });
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(null)
    });
    offerModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 3 })
    });
    positioningModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 4 })
    });

    await expect(
      editorialLineService.create("strategist-id", "launch-id", {
        pillars: [{ name: "Educacao", objective: "Nutrir audiencia", priority: 1 }]
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Editorial line requires avatar, offer and positioning context"
    });
  });
});

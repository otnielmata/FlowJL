import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const offerModel = {
  findOne: vi.fn()
};

const positioningModel = {
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

vi.mock("../src/models/offer.model.js", () => ({
  Offer: offerModel
}));

vi.mock("../src/models/positioning.model.js", () => ({
  Positioning: positioningModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { positioningService } = await import("../src/services/positioning.service.js");

describe("positioningService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("creates the current positioning for a launch", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    positioningModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue(null)
    });
    offerModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 2 })
    });
    positioningModel.create.mockResolvedValue({
      id: "positioning-id",
      launchId: "launch-id",
      version: 1,
      thesis: "Tese forte de mercado",
      centralPromise: "Promessa principal",
      differentiators: ["Diferencial 1"],
      references: ["Referencia 1"],
      offerVersion: 2,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T20:00:00.000Z"),
      updatedAt: new Date("2026-07-11T20:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await positioningService.create("strategist-id", "launch-id", {
      thesis: " Tese forte de mercado ",
      centralPromise: " Promessa principal ",
      differentiators: [" Diferencial 1 "],
      references: [" Referencia 1 "]
    });

    expect(positioningModel.create).toHaveBeenCalledWith(expect.objectContaining({
      launchId: "launch-id",
      version: 1,
      offerVersion: 2,
      isCurrent: true
    }));
    expect(result.version).toBe(1);
  });

  it("creates a new version when updating the current positioning", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    positioningModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue({
        id: "positioning-v1",
        version: 1,
        createdBy: "strategist-id"
      })
    });
    positioningModel.updateOne.mockResolvedValue(undefined);
    offerModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 3 })
    });
    positioningModel.create.mockResolvedValue({
      id: "positioning-v2",
      launchId: "launch-id",
      version: 2,
      thesis: "Nova tese",
      centralPromise: "Nova promessa",
      differentiators: ["Diferencial 2"],
      references: ["Referencia 2"],
      offerVersion: 3,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T20:10:00.000Z"),
      updatedAt: new Date("2026-07-11T20:10:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await positioningService.update("strategist-id", "launch-id", {
      thesis: "Nova tese",
      centralPromise: "Nova promessa",
      differentiators: ["Diferencial 2"],
      references: ["Referencia 2"]
    });

    expect(positioningModel.updateOne).toHaveBeenCalledWith(
      { _id: "positioning-v1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          isCurrent: false,
          active: false
        })
      })
    );
    expect(result.version).toBe(2);
  });

  it("rejects creation when a current positioning already exists", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    positioningModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue({ id: "positioning-id" })
    });

    await expect(
      positioningService.create("strategist-id", "launch-id", {
        thesis: "Tese forte",
        centralPromise: "Promessa central",
        differentiators: ["Diferencial"],
        references: ["Referencia"]
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "A current positioning already exists for this launch"
    });
  });
});

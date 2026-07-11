import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const avatarModel = {
  findOne: vi.fn()
};

const offerModel = {
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

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { offerService } = await import("../src/services/offer.service.js");

describe("offerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("creates the current offer for a launch", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    offerModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue(null)
    });
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 3 })
    });
    offerModel.create.mockResolvedValue({
      id: "offer-id",
      launchId: "launch-id",
      version: 1,
      product: "Produto Y",
      transformation: "Transformacao clara",
      promise: "Promessa principal",
      benefits: ["Beneficio 1"],
      differentials: ["Diferencial 1"],
      avatarVersion: 3,
      positioningContext: "Posicionamento atual",
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T19:00:00.000Z"),
      updatedAt: new Date("2026-07-11T19:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await offerService.create("strategist-id", "launch-id", {
      product: " Produto Y ",
      transformation: " Transformacao clara ",
      promise: " Promessa principal ",
      benefits: [" Beneficio 1 "],
      differentials: [" Diferencial 1 "],
      positioningContext: " Posicionamento atual "
    });

    expect(offerModel.create).toHaveBeenCalledWith(expect.objectContaining({
      launchId: "launch-id",
      version: 1,
      avatarVersion: 3,
      isCurrent: true
    }));
    expect(result.version).toBe(1);
  });

  it("creates a new version when updating the offer", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    offerModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue({
        id: "offer-v1",
        version: 1,
        createdBy: "strategist-id"
      })
    });
    offerModel.updateOne.mockResolvedValue(undefined);
    avatarModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 4 })
    });
    offerModel.create.mockResolvedValue({
      id: "offer-v2",
      launchId: "launch-id",
      version: 2,
      product: "Produto Y",
      transformation: "Nova transformacao",
      promise: "Nova promessa",
      benefits: ["Beneficio 2"],
      differentials: ["Diferencial 2"],
      avatarVersion: 4,
      positioningContext: null,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T19:10:00.000Z"),
      updatedAt: new Date("2026-07-11T19:10:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await offerService.update("strategist-id", "launch-id", {
      product: "Produto Y",
      transformation: "Nova transformacao",
      promise: "Nova promessa",
      benefits: ["Beneficio 2"],
      differentials: ["Diferencial 2"]
    });

    expect(offerModel.updateOne).toHaveBeenCalledWith(
      { _id: "offer-v1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          isCurrent: false,
          active: false
        })
      })
    );
    expect(result.version).toBe(2);
  });

  it("rejects creation when a current offer already exists", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    offerModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue({ id: "offer-id" })
    });

    await expect(
      offerService.create("strategist-id", "launch-id", {
        product: "Produto Y",
        transformation: "Transformacao",
        promise: "Promessa principal",
        benefits: ["Beneficio"],
        differentials: ["Diferencial"]
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "A current offer already exists for this launch"
    });
  });
});

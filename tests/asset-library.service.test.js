import { beforeEach, describe, expect, it, vi } from "vitest";

const assetLibraryItemModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/asset-library-item.model.js", () => ({
  AssetLibraryItem: assetLibraryItemModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { assetLibraryService } = await import("../src/services/asset-library.service.js");

describe("assetLibraryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    assetLibraryItemModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates a reusable asset with optional launch link", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id"
    });
    assetLibraryItemModel.create.mockResolvedValue({
      id: "asset-id",
      launchId: "launch-id",
      name: "Template de LP",
      type: "LANDING_PAGE",
      origin: "Notion interno",
      tags: ["lp", "conversao"],
      status: "AVAILABLE",
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await assetLibraryService.create("social-id", {
      launchId: "launch-id",
      name: " Template de LP ",
      type: " LANDING_PAGE ",
      origin: " Notion interno ",
      tags: [" lp ", "conversao", "lp"]
    });

    expect(assetLibraryItemModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      name: "Template de LP",
      type: "LANDING_PAGE",
      origin: "Notion interno",
      tags: ["lp", "conversao"],
      status: "AVAILABLE",
      active: true,
      deactivatedAt: null,
      createdBy: "social-id",
      updatedBy: "social-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "ASSET_LIBRARY_ITEM_CREATED",
      targetType: "ASSET_LIBRARY_ITEM",
      targetId: "asset-id",
      context: {
        launchId: "launch-id",
        type: "LANDING_PAGE",
        status: "AVAILABLE"
      }
    });
    expect(result.id).toBe("asset-id");
  });

  it("lists assets by filters", async () => {
    assetLibraryItemModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "asset-id",
          launchId: null,
          name: "Drive de referencias",
          type: "REFERENCE",
          origin: "Google Drive",
          tags: ["benchmark"],
          status: "AVAILABLE",
          active: true,
          deactivatedAt: null,
          createdAt: new Date("2026-07-12T12:00:00.000Z"),
          updatedAt: new Date("2026-07-12T12:00:00.000Z"),
          createdBy: "social-id",
          updatedBy: "social-id"
        }
      ])
    });

    const result = await assetLibraryService.list({
      type: "REFERENCE",
      tag: "benchmark",
      status: "AVAILABLE"
    });

    expect(assetLibraryItemModel.find).toHaveBeenCalledWith({
      type: "REFERENCE",
      tags: "benchmark",
      status: "AVAILABLE"
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("REFERENCE");
  });

  it("deactivates an asset logically", async () => {
    assetLibraryItemModel.findById.mockResolvedValue({
      id: "asset-id",
      launchId: null,
      name: "Drive de referencias",
      type: "REFERENCE",
      origin: "Google Drive",
      tags: ["benchmark"],
      status: "AVAILABLE",
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await assetLibraryService.deactivate("social-id", "asset-id");

    expect(assetLibraryItemModel.updateOne).toHaveBeenCalledWith(
      { _id: "asset-id" },
      {
        $set: {
          status: "ARCHIVED",
          active: false,
          deactivatedAt: expect.any(Date),
          updatedBy: "social-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "ASSET_LIBRARY_ITEM_DEACTIVATED",
      targetType: "ASSET_LIBRARY_ITEM",
      targetId: "asset-id",
      context: {
        launchId: null,
        type: "REFERENCE",
        previousStatus: "AVAILABLE",
        status: "ARCHIVED"
      }
    });
    expect(result.active).toBe(false);
  });

  it("rejects creation with unknown launch", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      assetLibraryService.create("social-id", {
        launchId: "launch-id",
        name: "Template de LP",
        type: "LANDING_PAGE",
        origin: "Notion interno",
        tags: ["lp"]
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });
});

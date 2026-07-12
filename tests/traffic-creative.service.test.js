import { beforeEach, describe, expect, it, vi } from "vitest";

const trafficCreativeModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const trafficCampaignModel = {
  findById: vi.fn()
};

const assetLibraryItemModel = {
  findById: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/models/traffic-creative.model.js", () => ({
  TrafficCreative: trafficCreativeModel
}));

vi.mock("../src/models/traffic-campaign.model.js", () => ({
  TrafficCampaign: trafficCampaignModel
}));

vi.mock("../src/models/asset-library-item.model.js", () => ({
  AssetLibraryItem: assetLibraryItemModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService
}));

const { trafficCreativeService } = await import("../src/services/traffic-creative.service.js");

function asDocument(data) {
  return {
    ...data,
    toObject() {
      return this;
    }
  };
}

describe("trafficCreativeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a creative linked to a valid campaign and asset", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-1",
      launchId: "launch-1",
      active: true
    });
    assetLibraryItemModel.findById.mockResolvedValue({
      id: "asset-1",
      active: true
    });
    trafficCreativeModel.create.mockImplementation(async (payload) => ({
      id: "creative-1",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await trafficCreativeService.create("user-1", {
      campaignId: "campaign-1",
      assetId: "asset-1",
      name: "Criativo Headline",
      format: "IMAGE",
      objective: "Gerar leads",
      origin: "ASSET_LIBRARY",
      status: "DRAFT"
    });

    expect(trafficCreativeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "campaign-1",
        launchId: "launch-1",
        assetId: "asset-1",
        format: "IMAGE",
        origin: "ASSET_LIBRARY",
        status: "DRAFT",
        classification: "UNTESTED",
        active: true
      })
    );
    expect(result.history[0]).toEqual(
      expect.objectContaining({
        action: "CREATED",
        toStatus: "DRAFT",
        toClassification: "UNTESTED"
      })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRAFFIC_CREATIVE_CREATED",
        targetId: "creative-1"
      })
    );
  });

  it("rejects creative creation without valid campaign", async () => {
    trafficCampaignModel.findById.mockResolvedValue(null);

    await expect(
      trafficCreativeService.create("user-1", {
        campaignId: "missing-campaign",
        name: "Criativo",
        format: "IMAGE",
        objective: "Gerar leads",
        origin: "MANUAL",
        status: "DRAFT"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Traffic campaign not found"
    });
  });

  it("rejects creative creation when asset is invalid", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-1",
      launchId: "launch-1",
      active: true
    });
    assetLibraryItemModel.findById.mockResolvedValue(null);

    await expect(
      trafficCreativeService.create("user-1", {
        campaignId: "campaign-1",
        assetId: "missing-asset",
        name: "Criativo",
        format: "IMAGE",
        objective: "Gerar leads",
        origin: "ASSET_LIBRARY",
        status: "DRAFT"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Asset not found"
    });
  });

  it("updates status, classification and performance with history", async () => {
    trafficCreativeModel.findById.mockResolvedValue(
      asDocument({
        id: "creative-2",
        campaignId: "campaign-2",
        launchId: "launch-2",
        assetId: null,
        name: "Criativo video",
        format: "VIDEO",
        objective: "Conversao",
        origin: "MANUAL",
        status: "IN_REVIEW",
        classification: "UNTESTED",
        performance: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0
        },
        history: [],
        active: true
      })
    );

    const result = await trafficCreativeService.update("user-2", "creative-2", {
      status: "ACTIVE",
      classification: "LEARNING",
      performance: {
        impressions: 1000,
        clicks: 80,
        conversions: 12,
        spend: 250
      },
      reason: "Teste iniciado"
    });

    expect(trafficCreativeModel.updateOne).toHaveBeenCalledWith(
      { _id: "creative-2" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "ACTIVE",
          classification: "LEARNING",
          performance: {
            impressions: 1000,
            clicks: 80,
            conversions: 12,
            spend: 250
          },
          updatedBy: "user-2"
        })
      })
    );
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "UPDATED",
        fromStatus: "IN_REVIEW",
        toStatus: "ACTIVE",
        fromClassification: "UNTESTED",
        toClassification: "LEARNING",
        reason: "Teste iniciado"
      })
    );
  });

  it("lists creatives by campaign, status and classification", async () => {
    trafficCreativeModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "creative-3",
          campaignId: "campaign-3",
          launchId: "launch-3",
          assetId: null,
          name: "Criativo vencedor",
          format: "IMAGE",
          objective: "Lead",
          origin: "MANUAL",
          status: "ACTIVE",
          classification: "WINNER",
          performance: {},
          history: [],
          active: true
        }
      ])
    });

    const result = await trafficCreativeService.list({
      campaignId: "campaign-3",
      status: "ACTIVE",
      classification: "WINNER"
    });

    expect(trafficCreativeModel.find).toHaveBeenCalledWith({
      active: true,
      campaignId: "campaign-3",
      status: "ACTIVE",
      classification: "WINNER"
    });
    expect(result[0].name).toBe("Criativo vencedor");
  });

  it("deactivates creative logically and stores history", async () => {
    trafficCreativeModel.findById.mockResolvedValue(
      asDocument({
        id: "creative-4",
        campaignId: "campaign-4",
        launchId: "launch-4",
        assetId: null,
        name: "Criativo pausado",
        format: "COPY",
        objective: "Lead",
        origin: "MANUAL",
        status: "PAUSED",
        classification: "LOSER",
        performance: {},
        history: [],
        active: true
      })
    );

    const result = await trafficCreativeService.deactivate("user-3", "creative-4");

    expect(trafficCreativeModel.updateOne).toHaveBeenCalledWith(
      { _id: "creative-4" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "ARCHIVED",
          active: false,
          updatedBy: "user-3"
        })
      })
    );
    expect(result.active).toBe(false);
    expect(result.status).toBe("ARCHIVED");
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "DEACTIVATED",
        fromStatus: "PAUSED",
        toStatus: "ARCHIVED"
      })
    );
  });
});

import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const trafficPixelModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const trafficCampaignModel = {
  findById: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/models/traffic-pixel.model.js", () => ({
  TrafficPixel: trafficPixelModel
}));

vi.mock("../src/models/traffic-campaign.model.js", () => ({
  TrafficCampaign: trafficCampaignModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService
}));

const { trafficPixelService } = await import("../src/services/traffic-pixel.service.js");

function asDocument(data) {
  return {
    ...data,
    toObject() {
      return this;
    }
  };
}

function hashSecret(value) {
  return createHash("sha256").update(value).digest("hex");
}

describe("trafficPixelService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a pixel from a valid campaign and hides sensitive data", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-1",
      launchId: "launch-1",
      active: true
    });
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      active: true
    });
    trafficPixelModel.create.mockImplementation(async (payload) => ({
      id: "pixel-1",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await trafficPixelService.create("user-1", {
      campaignIds: ["campaign-1"],
      platform: "META",
      externalPixelId: "123456",
      purpose: "Conversao de lead",
      status: "ACTIVE",
      conversionEventIds: ["event-1"],
      secrets: {
        accessToken: "token-super-secreto",
        secret: "segredo-do-pixel",
        tokenExpiresAt: "2026-08-01T00:00:00.000Z"
      }
    });

    expect(trafficPixelModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-1",
        platform: "META",
        externalPixelId: "123456",
        purpose: "Conversao de lead",
        status: "ACTIVE",
        campaignIds: ["campaign-1"],
        conversionEventIds: ["event-1"],
        secrets: {
          accessTokenHash: hashSecret("token-super-secreto"),
          secretHash: hashSecret("segredo-do-pixel"),
          tokenExpiresAt: new Date("2026-08-01T00:00:00.000Z")
        },
        active: true
      })
    );
    expect(result.secretState).toEqual({
      accessTokenConfigured: true,
      secretConfigured: true,
      tokenExpiresAt: new Date("2026-08-01T00:00:00.000Z")
    });
    expect(result).not.toHaveProperty("secrets");
    expect(JSON.stringify(result)).not.toContain("token-super-secreto");
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRAFFIC_PIXEL_CREATED",
        targetId: "pixel-1"
      })
    );
  });

  it("creates a manual pixel directly from a valid launch", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-2",
      active: true
    });
    trafficPixelModel.create.mockImplementation(async (payload) => ({
      id: "pixel-2",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await trafficPixelService.create("user-2", {
      launchId: "launch-2",
      platform: "GOOGLE",
      externalPixelId: "AW-123",
      purpose: "Remarketing"
    });

    expect(trafficCampaignModel.findById).not.toHaveBeenCalled();
    expect(result.launchId).toBe("launch-2");
    expect(result.status).toBe("DRAFT");
    expect(result.secretState.accessTokenConfigured).toBe(false);
  });

  it("rejects creation without launch or campaign context", async () => {
    await expect(
      trafficPixelService.create("user-1", {
        platform: "META",
        externalPixelId: "123456",
        purpose: "Conversao"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Traffic pixel requires a launch or campaign context"
    });
  });

  it("rejects campaign links that do not belong to the informed launch", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-3",
      launchId: "launch-other",
      active: true
    });

    await expect(
      trafficPixelService.create("user-1", {
        launchId: "launch-3",
        campaignIds: ["campaign-3"],
        platform: "META",
        externalPixelId: "123456",
        purpose: "Conversao"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Pixel campaigns must belong to the informed launch"
    });
  });

  it("updates campaign and conversion event links with an auditable history entry", async () => {
    trafficPixelModel.findById.mockResolvedValue(
      asDocument({
        id: "pixel-3",
        launchId: "launch-3",
        platform: "META",
        externalPixelId: "123456",
        purpose: "Lead",
        status: "ACTIVE",
        campaignIds: ["campaign-old"],
        conversionEventIds: [],
        secrets: {},
        history: [],
        active: true
      })
    );
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-new",
      launchId: "launch-3",
      active: true
    });

    const result = await trafficPixelService.updateLinks("user-3", "pixel-3", {
      campaignIds: ["campaign-new", "campaign-new"],
      conversionEventIds: ["event-1", "event-2"],
      reason: "Novo funil"
    });

    expect(trafficPixelModel.updateOne).toHaveBeenCalledWith(
      { _id: "pixel-3" },
      expect.objectContaining({
        $set: expect.objectContaining({
          campaignIds: ["campaign-new"],
          conversionEventIds: ["event-1", "event-2"],
          updatedBy: "user-3"
        })
      })
    );
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "LINKS_UPDATED",
        campaignIdsSnapshot: ["campaign-new"],
        conversionEventIdsSnapshot: ["event-1", "event-2"],
        reason: "Novo funil"
      })
    );
  });

  it("updates status and secrets without exposing raw credentials", async () => {
    trafficPixelModel.findById.mockResolvedValue(
      asDocument({
        id: "pixel-4",
        launchId: "launch-4",
        platform: "GOOGLE",
        externalPixelId: "AW-123",
        purpose: "Remarketing",
        status: "DRAFT",
        campaignIds: [],
        conversionEventIds: [],
        secrets: {
          accessTokenHash: "old-hash",
          secretHash: null,
          tokenExpiresAt: null
        },
        history: [],
        active: true
      })
    );

    const result = await trafficPixelService.update("user-4", "pixel-4", {
      status: "ACTIVE",
      secrets: {
        secret: "novo-segredo"
      },
      reason: "Pixel validado"
    });

    expect(trafficPixelModel.updateOne).toHaveBeenCalledWith(
      { _id: "pixel-4" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "ACTIVE",
          secrets: {
            accessTokenHash: "old-hash",
            secretHash: hashSecret("novo-segredo"),
            tokenExpiresAt: null
          },
          updatedBy: "user-4"
        })
      })
    );
    expect(result.secretState).toEqual({
      accessTokenConfigured: true,
      secretConfigured: true,
      tokenExpiresAt: null
    });
    expect(JSON.stringify(result)).not.toContain("novo-segredo");
  });

  it("lists pixels by campaign, platform and status", async () => {
    trafficPixelModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "pixel-5",
          launchId: "launch-5",
          platform: "META",
          externalPixelId: "123456",
          purpose: "Lead",
          status: "ACTIVE",
          campaignIds: ["campaign-5"],
          conversionEventIds: [],
          secrets: {},
          history: [],
          active: true
        }
      ])
    });

    const result = await trafficPixelService.list({
      campaignId: "campaign-5",
      platform: "meta",
      status: "active"
    });

    expect(trafficPixelModel.find).toHaveBeenCalledWith({
      active: true,
      campaignIds: "campaign-5",
      platform: "META",
      status: "ACTIVE"
    });
    expect(result[0].id).toBe("pixel-5");
  });

  it("deactivates a pixel logically and stores history", async () => {
    trafficPixelModel.findById.mockResolvedValue(
      asDocument({
        id: "pixel-6",
        launchId: "launch-6",
        platform: "META",
        externalPixelId: "123456",
        purpose: "Lead",
        status: "PAUSED",
        campaignIds: ["campaign-6"],
        conversionEventIds: ["event-6"],
        secrets: {},
        history: [],
        active: true
      })
    );

    const result = await trafficPixelService.deactivate("user-6", "pixel-6");

    expect(trafficPixelModel.updateOne).toHaveBeenCalledWith(
      { _id: "pixel-6" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "ARCHIVED",
          active: false,
          updatedBy: "user-6"
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

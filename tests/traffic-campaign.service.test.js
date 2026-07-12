import { beforeEach, describe, expect, it, vi } from "vitest";

const trafficCampaignModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/models/traffic-campaign.model.js", () => ({
  TrafficCampaign: trafficCampaignModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService
}));

const { trafficCampaignService } = await import("../src/services/traffic-campaign.service.js");

function asDocument(data) {
  return {
    ...data,
    toObject() {
      return this;
    }
  };
}

describe("trafficCampaignService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a traffic campaign linked to an active launch with UTC dates", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      active: true
    });
    trafficCampaignModel.create.mockImplementation(async (payload) => ({
      id: "campaign-1",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await trafficCampaignService.create("user-1", {
      launchId: "launch-1",
      name: "Campanha Meta",
      objective: "Gerar leads",
      channel: "META",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-15T23:59:59.000Z",
      status: "PLANNED",
      budget: 1500
    });

    expect(trafficCampaignModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-1",
        name: "Campanha Meta",
        objective: "Gerar leads",
        channel: "META",
        periodStart: new Date("2026-08-01T00:00:00.000Z"),
        periodEnd: new Date("2026-08-15T23:59:59.000Z"),
        status: "PLANNED",
        active: true
      })
    );
    expect(result.id).toBe("campaign-1");
    expect(result.history[0]).toEqual(
      expect.objectContaining({
        action: "CREATED",
        toStatus: "PLANNED",
        actedBy: "user-1"
      })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRAFFIC_CAMPAIGN_CREATED",
        targetId: "campaign-1"
      })
    );
  });

  it("rejects campaign creation without a valid launch", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      trafficCampaignService.create("user-1", {
        launchId: "missing-launch",
        name: "Campanha",
        objective: "Gerar leads",
        channel: "META",
        periodStart: "2026-08-01T00:00:00.000Z",
        periodEnd: "2026-08-15T23:59:59.000Z",
        status: "PLANNED"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });

  it("rejects invalid campaign periods", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      active: true
    });

    await expect(
      trafficCampaignService.create("user-1", {
        launchId: "launch-1",
        name: "Campanha",
        objective: "Gerar leads",
        channel: "META",
        periodStart: "2026-08-15T00:00:00.000Z",
        periodEnd: "2026-08-01T00:00:00.000Z",
        status: "PLANNED"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "periodStart must be before or equal to periodEnd"
    });
  });

  it("updates objective, period and status with auditable history", async () => {
    trafficCampaignModel.findById.mockResolvedValue(
      asDocument({
        id: "campaign-2",
        launchId: "launch-2",
        name: "Campanha Google",
        objective: "Trafego",
        channel: "GOOGLE",
        periodStart: new Date("2026-08-01T00:00:00.000Z"),
        periodEnd: new Date("2026-08-10T00:00:00.000Z"),
        status: "PLANNED",
        budget: 500,
        externalCampaignId: null,
        history: [],
        active: true
      })
    );

    const result = await trafficCampaignService.update("user-2", "campaign-2", {
      objective: "Gerar leads qualificados",
      periodEnd: "2026-08-20T00:00:00.000Z",
      status: "ACTIVE",
      reason: "Campanha iniciada"
    });

    expect(trafficCampaignModel.updateOne).toHaveBeenCalledWith(
      { _id: "campaign-2" },
      expect.objectContaining({
        $set: expect.objectContaining({
          objective: "Gerar leads qualificados",
          periodEnd: new Date("2026-08-20T00:00:00.000Z"),
          status: "ACTIVE",
          updatedBy: "user-2"
        })
      })
    );
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "UPDATED",
        fromStatus: "PLANNED",
        toStatus: "ACTIVE",
        reason: "Campanha iniciada"
      })
    );
  });

  it("lists active traffic campaigns by filters", async () => {
    trafficCampaignModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "campaign-3",
          launchId: "launch-3",
          name: "Campanha YouTube",
          objective: "Alcance",
          channel: "YOUTUBE",
          periodStart: new Date("2026-08-01T00:00:00.000Z"),
          periodEnd: new Date("2026-08-10T00:00:00.000Z"),
          status: "ACTIVE",
          budget: null,
          externalCampaignId: null,
          history: [],
          active: true
        }
      ])
    });

    const result = await trafficCampaignService.list({
      launchId: "launch-3",
      status: "ACTIVE",
      channel: "YOUTUBE"
    });

    expect(trafficCampaignModel.find).toHaveBeenCalledWith({
      active: true,
      launchId: "launch-3",
      status: "ACTIVE",
      channel: "YOUTUBE"
    });
    expect(result[0].name).toBe("Campanha YouTube");
  });

  it("deactivates campaign logically and stores history", async () => {
    trafficCampaignModel.findById.mockResolvedValue(
      asDocument({
        id: "campaign-4",
        launchId: "launch-4",
        name: "Campanha TikTok",
        objective: "Alcance",
        channel: "TIKTOK",
        periodStart: new Date("2026-08-01T00:00:00.000Z"),
        periodEnd: new Date("2026-08-10T00:00:00.000Z"),
        status: "PAUSED",
        budget: null,
        externalCampaignId: null,
        history: [],
        active: true
      })
    );

    const result = await trafficCampaignService.deactivate("user-3", "campaign-4");

    expect(trafficCampaignModel.updateOne).toHaveBeenCalledWith(
      { _id: "campaign-4" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "CANCELED",
          active: false,
          updatedBy: "user-3"
        })
      })
    );
    expect(result.active).toBe(false);
    expect(result.status).toBe("CANCELED");
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "DEACTIVATED",
        fromStatus: "PAUSED",
        toStatus: "CANCELED"
      })
    );
  });
});

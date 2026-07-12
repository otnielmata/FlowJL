import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const trafficCampaignModel = {
  find: vi.fn(),
  findById: vi.fn()
};

const trafficCreativeModel = {
  find: vi.fn()
};

const trafficAudienceModel = {
  find: vi.fn()
};

const trafficPixelModel = {
  find: vi.fn()
};

const trafficConversionEventModel = {
  find: vi.fn()
};

const trafficReportSnapshotModel = {
  find: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/traffic-campaign.model.js", () => ({
  TrafficCampaign: trafficCampaignModel
}));

vi.mock("../src/models/traffic-creative.model.js", () => ({
  TrafficCreative: trafficCreativeModel
}));

vi.mock("../src/models/traffic-audience.model.js", () => ({
  TrafficAudience: trafficAudienceModel
}));

vi.mock("../src/models/traffic-pixel.model.js", () => ({
  TrafficPixel: trafficPixelModel
}));

vi.mock("../src/models/traffic-conversion-event.model.js", () => ({
  TrafficConversionEvent: trafficConversionEventModel
}));

vi.mock("../src/models/traffic-report-snapshot.model.js", () => ({
  TrafficReportSnapshot: trafficReportSnapshotModel
}));

const { trafficReportService } = await import("../src/services/traffic-report.service.js");

function mockFindWithSort(model, value) {
  model.find.mockReturnValue({
    sort: vi.fn().mockResolvedValue(value)
  });
}

describe("trafficReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      name: "Lancamento X",
      expert: "Expert X",
      product: "Produto X",
      active: true
    });
    mockFindWithSort(trafficCampaignModel, [
      {
        id: "campaign-1",
        launchId: "launch-1",
        name: "Campanha Meta",
        channel: "META",
        status: "ACTIVE",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T23:59:59.000Z"),
        budget: 1000,
        active: true
      },
      {
        id: "campaign-2",
        launchId: "launch-1",
        name: "Campanha Google",
        channel: "GOOGLE",
        status: "ACTIVE",
        periodStart: new Date("2026-07-05T00:00:00.000Z"),
        periodEnd: new Date("2026-07-20T23:59:59.000Z"),
        budget: 500,
        active: true
      }
    ]);
    trafficCreativeModel.find.mockResolvedValue([
      {
        id: "creative-1",
        campaignId: "campaign-1",
        launchId: "launch-1",
        performance: {
          impressions: 1000,
          clicks: 100,
          conversions: 10,
          spend: 200
        },
        active: true
      },
      {
        id: "creative-2",
        campaignId: "campaign-2",
        launchId: "launch-1",
        performance: {
          impressions: 500,
          clicks: 50,
          conversions: 5,
          spend: 100
        },
        active: true
      }
    ]);
    trafficAudienceModel.find.mockResolvedValue([
      {
        id: "audience-1",
        launchId: "launch-1",
        campaignIds: ["campaign-1"],
        active: true
      }
    ]);
    trafficPixelModel.find.mockResolvedValue([
      {
        id: "pixel-1",
        launchId: "launch-1",
        campaignIds: ["campaign-1", "campaign-2"],
        active: true
      }
    ]);
    trafficConversionEventModel.find.mockResolvedValue([
      {
        id: "event-1",
        launchId: "launch-1",
        campaignIds: ["campaign-1"],
        eventAt: new Date("2026-07-12T12:00:00.000Z"),
        active: true
      }
    ]);
    trafficReportSnapshotModel.find.mockResolvedValue([
      {
        id: "snapshot-1",
        launchId: "launch-1",
        campaignId: "campaign-1",
        source: "META",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-15T23:59:59.000Z"),
        metrics: {
          impressions: 200,
          clicks: 20,
          conversions: 2,
          spend: 40,
          revenue: 300
        },
        syncedAt: new Date("2026-07-16T00:00:00.000Z"),
        active: true
      }
    ]);
  });

  it("returns a consolidated report by launch and period", async () => {
    const result = await trafficReportService.getReport({
      launchId: "launch-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z"
    });

    expect(trafficCampaignModel.find).toHaveBeenCalledWith({
      launchId: "launch-1",
      active: true,
      periodStart: { $lte: new Date("2026-07-31T23:59:59.000Z") },
      periodEnd: { $gte: new Date("2026-07-01T00:00:00.000Z") }
    });
    expect(trafficConversionEventModel.find).toHaveBeenCalledWith({
      launchId: "launch-1",
      active: true,
      $or: [
        { eventAt: { $gte: new Date("2026-07-01T00:00:00.000Z"), $lte: new Date("2026-07-31T23:59:59.000Z") } },
        { eventAt: null, createdAt: { $gte: new Date("2026-07-01T00:00:00.000Z"), $lte: new Date("2026-07-31T23:59:59.000Z") } }
      ]
    });
    expect(result.summary).toEqual(
      expect.objectContaining({
        campaignsCount: 2,
        creativesCount: 2,
        audiencesCount: 1,
        pixelsCount: 1,
        conversionEventsCount: 1,
        externalSnapshotsCount: 1,
        latestExternalSyncAt: new Date("2026-07-16T00:00:00.000Z")
      })
    );
    expect(result.summary.metrics).toEqual({
      impressions: 1700,
      clicks: 170,
      conversions: 17,
      spend: 340,
      revenue: 300
    });
    expect(result.summary.rates).toEqual({
      ctr: 0.1,
      conversionRate: 0.1,
      costPerConversion: 20,
      roas: 300 / 340
    });
    expect(result.breakdownByCampaign[0]).toEqual(
      expect.objectContaining({
        id: "campaign-1",
        creativesCount: 1,
        audiencesCount: 1,
        pixelsCount: 1,
        conversionEventsCount: 1,
        externalSnapshotsCount: 1
      })
    );
  });

  it("filters report by a specific campaign", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-1",
      launchId: "launch-1",
      active: true
    });

    await trafficReportService.getReport({
      launchId: "launch-1",
      campaignId: "campaign-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z"
    });

    expect(trafficCampaignModel.findById).toHaveBeenCalledWith("campaign-1");
    expect(trafficCampaignModel.find).toHaveBeenCalledWith({
      _id: "campaign-1",
      launchId: "launch-1",
      active: true
    });
    expect(trafficCreativeModel.find).toHaveBeenCalledWith({
      launchId: "launch-1",
      active: true,
      campaignId: "campaign-1"
    });
    expect(trafficAudienceModel.find).toHaveBeenCalledWith({
      launchId: "launch-1",
      active: true,
      campaignIds: "campaign-1"
    });
    expect(trafficReportSnapshotModel.find).toHaveBeenCalledWith({
      launchId: "launch-1",
      active: true,
      campaignId: "campaign-1",
      periodStart: { $lte: new Date("2026-07-31T23:59:59.000Z") },
      periodEnd: { $gte: new Date("2026-07-01T00:00:00.000Z") }
    });
  });

  it("rejects invalid period filters", async () => {
    await expect(
      trafficReportService.getReport({
        launchId: "launch-1",
        periodStart: "2026-08-01T00:00:00.000Z",
        periodEnd: "2026-07-01T00:00:00.000Z"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "periodStart must be before or equal to periodEnd"
    });
  });

  it("rejects campaign filters from another launch", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-other",
      launchId: "launch-other",
      active: true
    });

    await expect(
      trafficReportService.getReport({
        launchId: "launch-1",
        campaignId: "campaign-other",
        periodStart: "2026-07-01T00:00:00.000Z",
        periodEnd: "2026-07-31T23:59:59.000Z"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Traffic report campaign must belong to the informed launch"
    });
  });
});

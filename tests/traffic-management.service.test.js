import { beforeEach, describe, expect, it, vi } from "vitest";

const trafficCampaignModel = {
  find: vi.fn(),
  findById: vi.fn()
};

const trafficCreativeModel = {
  find: vi.fn()
};

const trafficReportSnapshotModel = {
  find: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const trafficCampaignService = {
  create: vi.fn(),
  update: vi.fn()
};

const trafficReportService = {
  getReport: vi.fn()
};

vi.mock("../src/models/traffic-campaign.model.js", () => ({
  TrafficCampaign: trafficCampaignModel
}));

vi.mock("../src/models/traffic-creative.model.js", () => ({
  TrafficCreative: trafficCreativeModel
}));

vi.mock("../src/models/traffic-report-snapshot.model.js", () => ({
  TrafficReportSnapshot: trafficReportSnapshotModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/traffic-campaign.service.js", () => ({
  trafficCampaignService
}));

vi.mock("../src/services/traffic-report.service.js", () => ({
  trafficReportService
}));

const { trafficManagementService } = await import("../src/services/traffic-management.service.js");

function buildCampaign(id, overrides = {}) {
  return {
    id,
    launchId: "launch-1",
    name: `Campanha ${id}`,
    objective: "Gerar leads",
    channel: "META",
    periodStart: new Date("2026-07-01T00:00:00.000Z"),
    periodEnd: new Date("2026-07-31T23:59:59.000Z"),
    status: "ACTIVE",
    budget: 1000,
    creativeIds: [],
    audienceIds: [],
    pixelIds: [],
    conversionEventIds: [],
    active: true,
    ...overrides
  };
}

describe("trafficManagementService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists campaigns with summarized media metrics", async () => {
    trafficCampaignModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildCampaign("campaign-1")])
    });
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      name: "Lancamento A",
      expert: "Expert A",
      product: "Produto A",
      active: true
    });
    trafficCreativeModel.find.mockResolvedValue([
      {
        performance: {
          spend: 200,
          conversions: 10
        }
      }
    ]);
    trafficReportSnapshotModel.find.mockResolvedValue([
      {
        metrics: {
          spend: 100,
          conversions: 5,
          revenue: 1200
        }
      }
    ]);

    const result = await trafficManagementService.listCampaigns({
      launchId: "launch-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z"
    });

    expect(result.summary).toEqual({
      campaignsCount: 1,
      budget: 1000,
      investment: 300,
      leads: 15,
      revenue: 1200,
      cpl: 20,
      roas: 4,
      insufficientDataCampaigns: 0
    });
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        name: "Campanha campaign-1",
        platform: "META",
        metrics: expect.objectContaining({
          investment: 300,
          leads: 15,
          cpl: 20,
          revenue: 1200,
          roas: 4
        })
      })
    );
  });

  it("compares selected campaigns using the aggregated module response", async () => {
    trafficCampaignModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        buildCampaign("campaign-1"),
        buildCampaign("campaign-2", { channel: "GOOGLE", budget: 500 })
      ])
    });
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      name: "Lancamento A",
      expert: "Expert A",
      product: "Produto A",
      active: true
    });
    trafficCreativeModel.find
      .mockResolvedValueOnce([{ performance: { spend: 100, conversions: 4 } }])
      .mockResolvedValueOnce([{ performance: { spend: 50, conversions: 2 } }]);
    trafficReportSnapshotModel.find
      .mockResolvedValueOnce([{ metrics: { spend: 50, conversions: 1, revenue: 400 } }])
      .mockResolvedValueOnce([{ metrics: { spend: 20, conversions: 1, revenue: 100 } }]);

    const result = await trafficManagementService.compareCampaigns({
      campaignIds: ["campaign-1", "campaign-2"]
    });

    expect(result.indicators.comparedCampaigns).toBe(2);
    expect(result.indicators.highestRevenueCampaignId).toBe("campaign-1");
    expect(result.items).toHaveLength(2);
  });

  it("requires confirmation for pause and exports report for campaign action", async () => {
    await expect(
      trafficManagementService.runCampaignAction("user-1", "campaign-1", {
        action: "PAUSE",
        confirmation: false,
        reason: "Pausar"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Action requires confirmation"
    });

    trafficCampaignModel.findById.mockResolvedValue(
      buildCampaign("campaign-1", {
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T23:59:59.000Z")
      })
    );
    trafficReportService.getReport.mockResolvedValue({
      summary: {
        metrics: {
          spend: 100,
          revenue: 300
        }
      }
    });

    const result = await trafficManagementService.runCampaignAction("user-1", "campaign-1", {
      action: "EXPORT_REPORT"
    });

    expect(result.type).toBe("TRAFFIC_REPORT_EXPORT");
    expect(trafficReportService.getReport).toHaveBeenCalledWith({
      launchId: "launch-1",
      campaignId: "campaign-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z"
    });
  });
});

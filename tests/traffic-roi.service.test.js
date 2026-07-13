import { beforeEach, describe, expect, it, vi } from "vitest";

const trafficReportService = {
  getReport: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/services/traffic-report.service.js", () => ({
  trafficReportService
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService
}));

const { calculateRoi, trafficRoiService } = await import("../src/services/traffic-roi.service.js");

function buildReport(overrides = {}) {
  return {
    filters: {
      launchId: "launch-1",
      campaignId: null,
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T23:59:59.000Z")
    },
    launch: {
      id: "launch-1",
      name: "Lancamento X",
      expert: "Expert X",
      product: "Produto X"
    },
    summary: {
      metrics: {
        impressions: 1000,
        clicks: 100,
        conversions: 20,
        spend: 500,
        revenue: 1500
      },
      latestExternalSyncAt: new Date("2026-07-16T00:00:00.000Z")
    },
    breakdownByCampaign: [
      {
        id: "campaign-1",
        name: "Campanha Meta",
        channel: "META",
        status: "ACTIVE",
        metrics: {
          impressions: 1000,
          clicks: 100,
          conversions: 20,
          spend: 500,
          revenue: 1500
        }
      },
      {
        id: "campaign-2",
        name: "Campanha Google",
        channel: "GOOGLE",
        status: "ACTIVE",
        metrics: {
          impressions: 500,
          clicks: 30,
          conversions: 0,
          spend: 100,
          revenue: 0
        }
      }
    ],
    ...overrides
  };
}

describe("trafficRoiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates ROI from report metrics and records audit", async () => {
    trafficReportService.getReport.mockResolvedValue(buildReport());

    const result = await trafficRoiService.calculate("user-1", {
      launchId: "launch-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z"
    });

    expect(result.result).toEqual({
      investment: 500,
      revenue: 1500,
      profit: 1000,
      roi: 2,
      roas: 3
    });
    expect(result.basis).toEqual(
      expect.objectContaining({
        formula: "(revenue - investment) / investment",
        investmentSource: "traffic_report.summary.metrics.spend",
        revenueSource: "traffic_report.summary.metrics.revenue"
      })
    );
    expect(result.breakdownByCampaign[1].result).toEqual({
      investment: 100,
      revenue: 0,
      profit: -100,
      roi: null,
      roas: null,
      insufficientData: true
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        action: "TRAFFIC_ROI_CALCULATED",
        targetType: "TRAFFIC_ROI",
        targetId: "launch-1",
        context: expect.objectContaining({
          launchId: "launch-1",
          campaignId: null,
          investment: 500,
          revenue: 1500,
          roi: 2,
          roas: 3
        })
      })
    );
  });

  it("calculates ROI for a campaign scope", async () => {
    trafficReportService.getReport.mockResolvedValue(
      buildReport({
        filters: {
          launchId: "launch-1",
          campaignId: "campaign-1",
          periodStart: new Date("2026-07-01T00:00:00.000Z"),
          periodEnd: new Date("2026-07-31T23:59:59.000Z")
        }
      })
    );

    await trafficRoiService.calculate("user-1", {
      launchId: "launch-1",
      campaignId: "campaign-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z"
    });

    expect(trafficReportService.getReport).toHaveBeenCalledWith({
      launchId: "launch-1",
      campaignId: "campaign-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z"
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: "campaign-1",
        context: expect.objectContaining({
          campaignId: "campaign-1"
        })
      })
    );
  });

  it("rejects ROI when there is no sufficient investment or revenue basis", async () => {
    trafficReportService.getReport.mockResolvedValue(
      buildReport({
        summary: {
          metrics: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            spend: 0,
            revenue: 1000
          },
          latestExternalSyncAt: null
        }
      })
    );

    await expect(
      trafficRoiService.calculate("user-1", {
        launchId: "launch-1",
        periodStart: "2026-07-01T00:00:00.000Z",
        periodEnd: "2026-07-31T23:59:59.000Z"
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      message: "Traffic ROI requires investment and revenue data"
    });
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it("uses the shared ROI formula", () => {
    expect(calculateRoi({ spend: 250, revenue: 1000 })).toEqual({
      investment: 250,
      revenue: 1000,
      profit: 750,
      roi: 3,
      roas: 4
    });
  });
});

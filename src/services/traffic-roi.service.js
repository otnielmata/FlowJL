import { auditService } from "./audit.service.js";
import { trafficReportService } from "./traffic-report.service.js";

function calculateRoi(metrics) {
  const investment = Number(metrics.spend ?? 0);
  const revenue = Number(metrics.revenue ?? 0);

  if (investment <= 0 || revenue <= 0) {
    throw {
      statusCode: 422,
      message: "Traffic ROI requires investment and revenue data"
    };
  }

  return {
    investment,
    revenue,
    profit: revenue - investment,
    roi: (revenue - investment) / investment,
    roas: revenue / investment
  };
}

class TrafficRoiService {
  async calculate(authenticatedUserId, filters) {
    const report = await trafficReportService.getReport(filters);
    const result = calculateRoi(report.summary.metrics);

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_ROI_CALCULATED",
      targetType: "TRAFFIC_ROI",
      targetId: filters.campaignId ?? filters.launchId,
      context: {
        launchId: filters.launchId,
        campaignId: filters.campaignId ?? null,
        periodStart: report.filters.periodStart,
        periodEnd: report.filters.periodEnd,
        investment: result.investment,
        revenue: result.revenue,
        roi: result.roi,
        roas: result.roas
      }
    });

    return {
      filters: report.filters,
      launch: report.launch,
      basis: {
        formula: "(revenue - investment) / investment",
        investmentSource: "traffic_report.summary.metrics.spend",
        revenueSource: "traffic_report.summary.metrics.revenue",
        metrics: report.summary.metrics,
        latestExternalSyncAt: report.summary.latestExternalSyncAt
      },
      result,
      breakdownByCampaign: report.breakdownByCampaign.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        metrics: campaign.metrics,
        result:
          campaign.metrics.spend > 0 && campaign.metrics.revenue > 0
            ? calculateRoi(campaign.metrics)
            : {
                investment: campaign.metrics.spend,
                revenue: campaign.metrics.revenue,
                profit: campaign.metrics.revenue - campaign.metrics.spend,
                roi: null,
                roas: null,
                insufficientData: true
              }
      })),
      generatedAt: new Date()
    };
  }
}

export const trafficRoiService = new TrafficRoiService();
export { calculateRoi };

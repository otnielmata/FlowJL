import { Launch } from "../models/launch.model.js";
import { TrafficAudience } from "../models/traffic-audience.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
import { TrafficConversionEvent } from "../models/traffic-conversion-event.model.js";
import { TrafficCreative } from "../models/traffic-creative.model.js";
import { TrafficPixel } from "../models/traffic-pixel.model.js";
import { TrafficReportSnapshot } from "../models/traffic-report-snapshot.model.js";

function normalizeDate(value) {
  return new Date(value);
}

function ensureValidPeriod(periodStart, periodEnd) {
  if (periodStart.getTime() > periodEnd.getTime()) {
    throw {
      statusCode: 400,
      message: "periodStart must be before or equal to periodEnd"
    };
  }
}

function ensureCampaignBelongsToLaunch(campaign, launchId) {
  if (!campaign || !campaign.active) {
    throw {
      statusCode: 404,
      message: "Traffic campaign not found"
    };
  }

  if (campaign.launchId !== launchId) {
    throw {
      statusCode: 409,
      message: "Traffic report campaign must belong to the informed launch"
    };
  }
}

function numberOrZero(value) {
  return Number(value ?? 0);
}

function emptyMetrics() {
  return {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    revenue: 0
  };
}

function addMetrics(target, metrics = {}) {
  target.impressions += numberOrZero(metrics.impressions);
  target.clicks += numberOrZero(metrics.clicks);
  target.conversions += numberOrZero(metrics.conversions);
  target.spend += numberOrZero(metrics.spend);
  target.revenue += numberOrZero(metrics.revenue);

  return target;
}

function calculateRates(metrics) {
  return {
    ctr: metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0,
    conversionRate: metrics.clicks > 0 ? metrics.conversions / metrics.clicks : 0,
    costPerConversion: metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0,
    roas: metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
  };
}

function createCampaignSummary(campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    channel: campaign.channel,
    status: campaign.status,
    periodStart: campaign.periodStart,
    periodEnd: campaign.periodEnd,
    budget: campaign.budget ?? null,
    metrics: emptyMetrics(),
    creativesCount: 0,
    audiencesCount: 0,
    pixelsCount: 0,
    conversionEventsCount: 0,
    externalSnapshotsCount: 0
  };
}

function addItemToCampaigns(campaignMap, campaignIds = [], field) {
  for (const campaignId of campaignIds) {
    const campaign = campaignMap.get(campaignId);

    if (campaign) {
      campaign[field] += 1;
    }
  }
}

function buildCampaignFilter({ launchId, campaignId, periodStart, periodEnd }) {
  if (campaignId) {
    return {
      _id: campaignId,
      launchId,
      active: true
    };
  }

  return {
    launchId,
    active: true,
    periodStart: { $lte: periodEnd },
    periodEnd: { $gte: periodStart }
  };
}

class TrafficReportService {
  async getReport(filters) {
    const periodStart = normalizeDate(filters.periodStart);
    const periodEnd = normalizeDate(filters.periodEnd);
    ensureValidPeriod(periodStart, periodEnd);

    const launch = await Launch.findById(filters.launchId);

    if (!launch || launch.active === false) {
      throw {
        statusCode: 404,
        message: "Launch not found"
      };
    }

    if (filters.campaignId) {
      const campaign = await TrafficCampaign.findById(filters.campaignId);
      ensureCampaignBelongsToLaunch(campaign, filters.launchId);
    }

    const campaignFilter = buildCampaignFilter({
      launchId: filters.launchId,
      campaignId: filters.campaignId,
      periodStart,
      periodEnd
    });
    const campaigns = await TrafficCampaign.find(campaignFilter).sort({ periodStart: 1, name: 1 });
    const campaignIds = campaigns.map((campaign) => campaign.id);
    const campaignScopedFilter = filters.campaignId ? { campaignIds: filters.campaignId } : {};
    const singleCampaignFilter = filters.campaignId ? { campaignId: filters.campaignId } : {};

    const [creatives, audiences, pixels, conversionEvents, snapshots] = await Promise.all([
      TrafficCreative.find({
        launchId: filters.launchId,
        active: true,
        ...(filters.campaignId ? { campaignId: filters.campaignId } : {})
      }),
      TrafficAudience.find({
        launchId: filters.launchId,
        active: true,
        ...campaignScopedFilter
      }),
      TrafficPixel.find({
        launchId: filters.launchId,
        active: true,
        ...campaignScopedFilter
      }),
      TrafficConversionEvent.find({
        launchId: filters.launchId,
        active: true,
        ...campaignScopedFilter,
        $or: [
          { eventAt: { $gte: periodStart, $lte: periodEnd } },
          { eventAt: null, createdAt: { $gte: periodStart, $lte: periodEnd } }
        ]
      }),
      TrafficReportSnapshot.find({
        launchId: filters.launchId,
        active: true,
        ...singleCampaignFilter,
        periodStart: { $lte: periodEnd },
        periodEnd: { $gte: periodStart }
      })
    ]);

    const totals = emptyMetrics();
    const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, createCampaignSummary(campaign)]));

    for (const creative of creatives) {
      addMetrics(totals, creative.performance);
      const campaign = campaignMap.get(creative.campaignId);

      if (campaign) {
        campaign.creativesCount += 1;
        addMetrics(campaign.metrics, creative.performance);
      }
    }

    for (const snapshot of snapshots) {
      addMetrics(totals, snapshot.metrics);

      if (snapshot.campaignId) {
        const campaign = campaignMap.get(snapshot.campaignId);

        if (campaign) {
          campaign.externalSnapshotsCount += 1;
          addMetrics(campaign.metrics, snapshot.metrics);
        }
      }
    }

    for (const audience of audiences) {
      addItemToCampaigns(campaignMap, audience.campaignIds, "audiencesCount");
    }

    for (const pixel of pixels) {
      addItemToCampaigns(campaignMap, pixel.campaignIds, "pixelsCount");
    }

    for (const event of conversionEvents) {
      addItemToCampaigns(campaignMap, event.campaignIds, "conversionEventsCount");
    }

    const breakdownByCampaign = [...campaignMap.values()].map((campaign) => ({
      ...campaign,
      rates: calculateRates(campaign.metrics)
    }));
    const latestExternalSyncAt = snapshots
      .map((snapshot) => snapshot.syncedAt)
      .filter(Boolean)
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

    return {
      filters: {
        launchId: filters.launchId,
        campaignId: filters.campaignId ?? null,
        periodStart,
        periodEnd
      },
      launch: {
        id: launch.id,
        name: launch.name,
        expert: launch.expert,
        product: launch.product
      },
      summary: {
        campaignsCount: campaigns.length,
        creativesCount: creatives.length,
        audiencesCount: audiences.length,
        pixelsCount: pixels.length,
        conversionEventsCount: conversionEvents.length,
        externalSnapshotsCount: snapshots.length,
        metrics: totals,
        rates: calculateRates(totals),
        latestExternalSyncAt
      },
      breakdownByCampaign,
      generatedAt: new Date()
    };
  }
}

export const trafficReportService = new TrafficReportService();

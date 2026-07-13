import { Launch } from "../models/launch.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
import { TrafficCreative } from "../models/traffic-creative.model.js";
import { TrafficReportSnapshot } from "../models/traffic-report-snapshot.model.js";
import { trafficCampaignService } from "./traffic-campaign.service.js";
import { trafficReportService } from "./traffic-report.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeUpper(value) {
  return value?.trim().toUpperCase() ?? null;
}

function numberOrZero(value) {
  return Number(value ?? 0);
}

function calculateDerivedMetrics(metrics) {
  const investment = numberOrZero(metrics.investment);
  const leads = numberOrZero(metrics.leads);
  const revenue = numberOrZero(metrics.revenue);

  return {
    investment,
    leads,
    cpl: leads > 0 ? investment / leads : null,
    revenue,
    roas: investment > 0 && revenue > 0 ? revenue / investment : null,
    insufficientData: leads <= 0 || investment <= 0 || revenue <= 0
  };
}

function buildEmptySummary() {
  return {
    investment: 0,
    leads: 0,
    revenue: 0
  };
}

function addToSummary(summary, metrics) {
  summary.investment += numberOrZero(metrics.investment);
  summary.leads += numberOrZero(metrics.leads);
  summary.revenue += numberOrZero(metrics.revenue);

  return summary;
}

function buildChartGroups(campaigns) {
  const byPlatform = new Map();
  const byStatus = new Map();

  for (const campaign of campaigns) {
    byPlatform.set(campaign.platform, (byPlatform.get(campaign.platform) ?? 0) + campaign.metrics.investment);
    byStatus.set(campaign.status, (byStatus.get(campaign.status) ?? 0) + 1);
  }

  return {
    investmentByPlatform: [...byPlatform.entries()].map(([platform, investment]) => ({ platform, investment })),
    campaignsByStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count }))
  };
}

async function resolveLaunchMap(launchIds = []) {
  const launches = await Promise.all(launchIds.map((launchId) => Launch.findById(launchId)));

  return new Map(
    launches
      .filter((launch) => launch && launch.active !== false)
      .map((launch) => [
        launch.id,
        {
          id: launch.id,
          name: launch.name,
          expert: launch.expert ?? null,
          product: launch.product ?? null
        }
      ])
  );
}

function buildCampaignMetrics(campaign, creatives, snapshots, periodStart, periodEnd) {
  const investmentFromCreatives = creatives.reduce((total, creative) => total + numberOrZero(creative.performance?.spend), 0);
  const investmentFromSnapshots = snapshots.reduce((total, snapshot) => total + numberOrZero(snapshot.metrics?.spend), 0);
  const leadsFromCreatives = creatives.reduce((total, creative) => total + numberOrZero(creative.performance?.conversions), 0);
  const leadsFromSnapshots = snapshots.reduce((total, snapshot) => total + numberOrZero(snapshot.metrics?.conversions), 0);
  const revenue = snapshots.reduce((total, snapshot) => total + numberOrZero(snapshot.metrics?.revenue), 0);

  return {
    periodStart,
    periodEnd,
    budget: campaign.budget ?? null,
    investment: investmentFromCreatives + investmentFromSnapshots,
    leads: leadsFromCreatives + leadsFromSnapshots,
    revenue,
    ...calculateDerivedMetrics({
      investment: investmentFromCreatives + investmentFromSnapshots,
      leads: leadsFromCreatives + leadsFromSnapshots,
      revenue
    })
  };
}

function mapCampaignListItem(campaign, launch, metrics) {
  return {
    id: campaign.id,
    name: campaign.name,
    platform: campaign.channel,
    objective: campaign.objective,
    status: campaign.status,
    launch: launch ?? {
      id: campaign.launchId,
      name: null,
      expert: null,
      product: null
    },
    budget: campaign.budget ?? null,
    metrics,
    relationships: {
      creativeIds: [...(campaign.creativeIds ?? [])],
      audienceIds: [...(campaign.audienceIds ?? [])],
      pixelIds: [...(campaign.pixelIds ?? [])],
      conversionEventIds: [...(campaign.conversionEventIds ?? [])]
    },
    actions: {
      canPause: ["PLANNED", "ACTIVE"].includes(campaign.status),
      canFinish: ["PLANNED", "ACTIVE", "PAUSED"].includes(campaign.status),
      canDuplicate: true,
      canExportReport: true
    }
  };
}

function ensureActionConfirmed(action, confirmation) {
  if (["PAUSE", "FINISH"].includes(action) && confirmation !== true) {
    throw {
      statusCode: 409,
      message: "Action requires confirmation"
    };
  }
}

class TrafficManagementService {
  async listCampaigns(filters = {}) {
    const query = {
      active: true
    };

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.status) {
      query.status = normalizeUpper(filters.status);
    }

    if (filters.channel) {
      query.channel = normalizeUpper(filters.channel);
    }

    const campaigns = await TrafficCampaign.find(query).sort({ createdAt: -1, name: 1 });
    const periodStart = normalizeDate(filters.periodStart) ?? null;
    const periodEnd = normalizeDate(filters.periodEnd) ?? null;
    const launchMap = await resolveLaunchMap([...new Set(campaigns.map((campaign) => campaign.launchId))]);
    const items = [];
    const summary = buildEmptySummary();

    for (const campaign of campaigns) {
      const creatives = await TrafficCreative.find({
        campaignId: campaign.id,
        active: true
      });
      const snapshotQuery = {
        launchId: campaign.launchId,
        campaignId: campaign.id,
        active: true
      };

      if (periodStart && periodEnd) {
        snapshotQuery.periodStart = { $lte: periodEnd };
        snapshotQuery.periodEnd = { $gte: periodStart };
      }

      const snapshots = await TrafficReportSnapshot.find(snapshotQuery);
      const metrics = buildCampaignMetrics(campaign, creatives, snapshots, periodStart, periodEnd);

      addToSummary(summary, metrics);
      items.push(mapCampaignListItem(campaign, launchMap.get(campaign.launchId) ?? null, metrics));
    }

    return {
      filters: {
        launchId: filters.launchId ?? null,
        channel: filters.channel ?? null,
        status: filters.status ?? null,
        periodStart,
        periodEnd
      },
      summary: {
        campaignsCount: items.length,
        budget: items.reduce((total, campaign) => total + numberOrZero(campaign.budget), 0),
        investment: summary.investment,
        leads: summary.leads,
        revenue: summary.revenue,
        cpl: summary.leads > 0 ? summary.investment / summary.leads : null,
        roas: summary.investment > 0 && summary.revenue > 0 ? summary.revenue / summary.investment : null,
        insufficientDataCampaigns: items.filter((campaign) => campaign.metrics.insufficientData).length
      },
      items
    };
  }

  async createCampaign(authenticatedUserId, data) {
    return trafficCampaignService.create(authenticatedUserId, data);
  }

  async updateCampaign(authenticatedUserId, campaignId, data) {
    return trafficCampaignService.update(authenticatedUserId, campaignId, data);
  }

  async getDashboard(filters) {
    const list = await this.listCampaigns(filters);

    return {
      filters: list.filters,
      indicators: list.summary,
      charts: buildChartGroups(list.items),
      emptyState: {
        hasCampaigns: list.items.length > 0,
        hasEnoughDataForIndicators: list.summary.investment > 0 || list.summary.leads > 0 || list.summary.revenue > 0
      },
      actions: {
        requiresConfirmation: ["PAUSE", "FINISH"],
        available: ["PAUSE", "FINISH", "DUPLICATE", "EXPORT_REPORT"]
      }
    };
  }

  async compareCampaigns(filters) {
    const list = await this.listCampaigns(filters);
    const campaignIds = new Set(filters.campaignIds ?? []);
    const items = list.items.filter((campaign) => campaignIds.has(campaign.id));

    return {
      filters: {
        ...list.filters,
        campaignIds: [...campaignIds]
      },
      indicators: {
        comparedCampaigns: items.length,
        highestInvestmentCampaignId:
          [...items].sort((left, right) => right.metrics.investment - left.metrics.investment)[0]?.id ?? null,
        highestRevenueCampaignId: [...items].sort((left, right) => right.metrics.revenue - left.metrics.revenue)[0]?.id ?? null,
        bestRoasCampaignId:
          [...items].sort((left, right) => (right.metrics.roas ?? -1) - (left.metrics.roas ?? -1))[0]?.id ?? null
      },
      items
    };
  }

  async runCampaignAction(authenticatedUserId, campaignId, data) {
    ensureActionConfirmed(data.action, data.confirmation);

    if (data.action === "PAUSE") {
      return trafficCampaignService.update(authenticatedUserId, campaignId, {
        status: "PAUSED",
        reason: data.reason
      });
    }

    if (data.action === "FINISH") {
      return trafficCampaignService.update(authenticatedUserId, campaignId, {
        status: "FINISHED",
        reason: data.reason
      });
    }

    if (data.action === "DUPLICATE") {
      const campaign = await TrafficCampaign.findById(campaignId);

      if (!campaign || !campaign.active) {
        throw {
          statusCode: 404,
          message: "Traffic campaign not found"
        };
      }

      return trafficCampaignService.create(authenticatedUserId, {
        launchId: campaign.launchId,
        name: `${campaign.name} - Copia`,
        objective: campaign.objective,
        channel: campaign.channel,
        periodStart: campaign.periodStart.toISOString(),
        periodEnd: campaign.periodEnd.toISOString(),
        status: "DRAFT",
        budget: campaign.budget ?? undefined,
        externalCampaignId: null,
        creativeIds: campaign.creativeIds ?? [],
        audienceIds: campaign.audienceIds ?? [],
        pixelIds: campaign.pixelIds ?? [],
        conversionEventIds: campaign.conversionEventIds ?? []
      });
    }

    if (data.action === "EXPORT_REPORT") {
      const campaign = await TrafficCampaign.findById(campaignId);

      if (!campaign || !campaign.active) {
        throw {
          statusCode: 404,
          message: "Traffic campaign not found"
        };
      }

      return {
        type: "TRAFFIC_REPORT_EXPORT",
        export: await trafficReportService.getReport({
          launchId: campaign.launchId,
          campaignId: campaign.id,
          periodStart: data.periodStart ?? campaign.periodStart.toISOString(),
          periodEnd: data.periodEnd ?? campaign.periodEnd.toISOString()
        })
      };
    }

    throw {
      statusCode: 400,
      message: "Unsupported traffic management action"
    };
  }
}

export const trafficManagementService = new TrafficManagementService();

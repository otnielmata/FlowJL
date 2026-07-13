import { ContentApproval } from "../models/content-approval.model.js";
import { ContentProduction } from "../models/content-production.model.js";
import { Launch } from "../models/launch.model.js";
import { OperationalSchedule } from "../models/operational-schedule.model.js";
import { Publication } from "../models/publication.model.js";
import { ReportView } from "../models/report-view.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
import { TrafficReportSnapshot } from "../models/traffic-report-snapshot.model.js";
import { auditService } from "./audit.service.js";

const completedOperationalStatuses = new Set(["DONE"]);
const terminalOperationalStatuses = new Set(["DONE", "CANCELED"]);

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeText(value) {
  return value?.trim() ?? null;
}

function normalizeFilters(filters = {}) {
  return {
    launchId: filters.launchId ?? null,
    periodStart: normalizeDate(filters.periodStart),
    periodEnd: normalizeDate(filters.periodEnd),
    comparePeriodStart: normalizeDate(filters.comparePeriodStart),
    comparePeriodEnd: normalizeDate(filters.comparePeriodEnd),
    responsible: normalizeText(filters.responsible),
    channel: normalizeText(filters.channel)?.toUpperCase() ?? null,
    campaignId: filters.campaignId ?? null,
    status: normalizeText(filters.status)?.toUpperCase() ?? null,
    approvalStatus: normalizeText(filters.approvalStatus)?.toUpperCase() ?? null
  };
}

function ensureValidPeriod(start, end, label = "period") {
  if (!start || !end) {
    throw {
      statusCode: 400,
      message: `${label} requires start and end dates`
    };
  }

  if (start.getTime() > end.getTime()) {
    throw {
      statusCode: 400,
      message: `${label} start must be before or equal to end`
    };
  }
}

function toNumber(value) {
  return Number(value ?? 0);
}

function buildAppliedRecut(filters) {
  return {
    launchId: filters.launchId,
    periodStart: filters.periodStart,
    periodEnd: filters.periodEnd,
    comparePeriodStart: filters.comparePeriodStart,
    comparePeriodEnd: filters.comparePeriodEnd,
    responsible: filters.responsible,
    channel: filters.channel,
    campaignId: filters.campaignId,
    status: filters.status,
    approvalStatus: filters.approvalStatus,
    description: `Periodo ${filters.periodStart.toISOString().slice(0, 10)} a ${filters.periodEnd.toISOString().slice(0, 10)}`
  };
}

function buildSeries(items, valueResolver) {
  return items.map((item) => ({
    label: item.label,
    value: valueResolver(item)
  }));
}

function calculatePercentage(current, total) {
  return total > 0 ? Math.round((current / total) * 100) : 0;
}

function calculateTrend(current, previous) {
  if (previous === null || previous === undefined) {
    return {
      direction: "NEUTRAL",
      delta: null
    };
  }

  const delta = current - previous;

  return {
    direction: delta > 0 ? "UP" : delta < 0 ? "DOWN" : "NEUTRAL",
    delta
  };
}

function deriveCpl(spend, leads) {
  return leads > 0 ? spend / leads : 0;
}

function deriveRoas(revenue, spend) {
  return spend > 0 ? revenue / spend : 0;
}

function deriveOperationalProgress(done, total) {
  return calculatePercentage(done, total);
}

function buildState({ hasPermission = true, empty = false }) {
  return {
    loading: false,
    empty,
    error: null,
    permission: hasPermission ? "GRANTED" : "DENIED"
  };
}

function inPeriod(date, start, end) {
  return Boolean(date) && date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function overlapsPeriod(startAt, endAt, filterStart, filterEnd) {
  if (!startAt || !endAt) {
    return false;
  }

  return startAt.getTime() <= filterEnd.getTime() && endAt.getTime() >= filterStart.getTime();
}

function normalizeLaunchSummary(launch) {
  if (!launch) {
    return null;
  }

  return {
    id: launch.id,
    name: launch.name,
    expert: launch.expert,
    product: launch.product,
    status: launch.status
  };
}

function buildExportFeedback(actionType, format) {
  return {
    actionType,
    format,
    status: "READY",
    message:
      actionType === "PRINT"
        ? "Visao preparada para impressao."
        : `Relatorio preparado para exportacao em ${format}.`,
    feedback: "A acao correspondente pode ser exibida pela interface com retorno visual apropriado."
  };
}

function toPublicReportView(view) {
  return {
    id: view.id,
    name: view.name,
    description: view.description ?? null,
    type: view.type,
    ownerUserId: view.ownerUserId,
    filters: {
      launchId: view.filters.launchId ?? null,
      periodStart: view.filters.periodStart ?? null,
      periodEnd: view.filters.periodEnd ?? null,
      comparePeriodStart: view.filters.comparePeriodStart ?? null,
      comparePeriodEnd: view.filters.comparePeriodEnd ?? null,
      responsible: view.filters.responsible ?? null,
      channel: view.filters.channel ?? null,
      campaignId: view.filters.campaignId ?? null,
      status: view.filters.status ?? null,
      approvalStatus: view.filters.approvalStatus ?? null
    },
    layout: {
      widgets: [...(view.layout?.widgets ?? [])],
      shared: view.layout?.shared ?? false
    },
    lastExportedAt: view.lastExportedAt ?? null,
    active: view.active,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt
  };
}

async function resolveLaunch(filters) {
  if (!filters.launchId) {
    return null;
  }

  const launch = await Launch.findById(filters.launchId);

  if (!launch || launch.active === false) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return launch;
}

function filterOperationalItems(items, filters, now = new Date()) {
  return items.filter((item) => {
    if (filters.responsible && item.responsible !== filters.responsible) return false;
    if (filters.status && item.status !== filters.status) return false;
    return overlapsPeriod(normalizeDate(item.startsAt), normalizeDate(item.dueAt), filters.periodStart, filters.periodEnd);
  }).map((item) => ({
    id: item.id,
    launchId: item.launchId,
    title: item.title,
    area: item.area,
    responsible: item.responsible,
    priority: item.priority,
    status: item.status,
    startsAt: normalizeDate(item.startsAt),
    dueAt: normalizeDate(item.dueAt),
    delayed: !terminalOperationalStatuses.has(item.status) && normalizeDate(item.dueAt).getTime() < now.getTime()
  }));
}

function filterContents(items, filters) {
  return items.filter((item) => {
    if (filters.responsible && item.responsible !== filters.responsible) return false;
    if (filters.channel && item.channel !== filters.channel) return false;
    if (filters.status && item.currentStatus !== filters.status) return false;
    return true;
  });
}

function filterPublications(items, filters) {
  return items.filter((item) => {
    if (filters.channel && item.channel !== filters.channel) return false;
    if (filters.status && item.status !== filters.status) return false;
    return inPeriod(normalizeDate(item.publishAt), filters.periodStart, filters.periodEnd);
  });
}

function filterApprovals(items, filters) {
  return items.filter((item) => {
    if (filters.approvalStatus && item.currentStatus !== filters.approvalStatus) return false;
    return inPeriod(normalizeDate(item.updatedAt ?? item.createdAt), filters.periodStart, filters.periodEnd);
  });
}

function filterCampaigns(items, filters) {
  return items.filter((item) => {
    if (filters.channel && item.channel !== filters.channel) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.campaignId && item.id !== filters.campaignId) return false;
    return overlapsPeriod(normalizeDate(item.periodStart), normalizeDate(item.periodEnd), filters.periodStart, filters.periodEnd);
  });
}

function filterSnapshots(items, filters) {
  return items.filter((item) => {
    if (filters.campaignId && item.campaignId !== filters.campaignId) return false;
    return overlapsPeriod(normalizeDate(item.periodStart), normalizeDate(item.periodEnd), filters.periodStart, filters.periodEnd);
  });
}

function buildGroupedCounts(items, keyResolver) {
  return Object.entries(
    items.reduce((accumulator, item) => {
      const key = keyResolver(item);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {})
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

function summarizeTraffic(snapshots = []) {
  return snapshots.reduce(
    (accumulator, snapshot) => {
      accumulator.impressions += toNumber(snapshot.metrics?.impressions);
      accumulator.clicks += toNumber(snapshot.metrics?.clicks);
      accumulator.leads += toNumber(snapshot.metrics?.clicks);
      accumulator.conversions += toNumber(snapshot.metrics?.conversions);
      accumulator.revenue += toNumber(snapshot.metrics?.revenue);
      accumulator.spend += toNumber(snapshot.metrics?.spend);
      return accumulator;
    },
    {
      impressions: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      revenue: 0,
      spend: 0
    }
  );
}

function buildComparisonSummary(currentSummary, previousSummary) {
  if (!previousSummary) {
    return null;
  }

  return {
    tasksCompleted: calculateTrend(currentSummary.tasksCompleted, previousSummary.tasksCompleted),
    tasksDelayed: calculateTrend(currentSummary.tasksDelayed, previousSummary.tasksDelayed),
    contentsPublished: calculateTrend(currentSummary.contentsPublished, previousSummary.contentsPublished),
    leads: calculateTrend(currentSummary.leads, previousSummary.leads),
    cpl: calculateTrend(currentSummary.cpl, previousSummary.cpl),
    conversions: calculateTrend(currentSummary.conversions, previousSummary.conversions),
    revenue: calculateTrend(currentSummary.revenue, previousSummary.revenue),
    roas: calculateTrend(currentSummary.roas, previousSummary.roas),
    operationalProgress: calculateTrend(currentSummary.operationalProgress, previousSummary.operationalProgress)
  };
}

function buildReportPayload(dataset, filters, launch, previousSummary = null) {
  const tasksCompleted = dataset.operationalItems.filter((item) => completedOperationalStatuses.has(item.status)).length;
  const tasksDelayed = dataset.operationalItems.filter((item) => item.delayed).length;
  const contentsPublished = dataset.publications.filter((item) => item.status === "PUBLISHED").length;
  const pendingApprovals = dataset.approvals.filter((item) => item.currentStatus !== "PUBLISHED" && item.currentStatus !== "APPROVED").length;
  const trafficSummary = summarizeTraffic(dataset.snapshots);
  const cpl = deriveCpl(trafficSummary.spend, trafficSummary.leads);
  const roas = deriveRoas(trafficSummary.revenue, trafficSummary.spend);
  const operationalProgress = deriveOperationalProgress(tasksCompleted, dataset.operationalItems.length);

  const currentSummary = {
    tasksCompleted,
    tasksDelayed,
    contentsPublished,
    leads: trafficSummary.leads,
    cpl,
    conversions: trafficSummary.conversions,
    revenue: trafficSummary.revenue,
    roas,
    operationalProgress
  };

  const empty =
    dataset.operationalItems.length === 0 &&
    dataset.contents.length === 0 &&
    dataset.publications.length === 0 &&
    dataset.approvals.length === 0 &&
    dataset.campaigns.length === 0 &&
    dataset.snapshots.length === 0;

  return {
    filters: buildAppliedRecut(filters),
    launch: normalizeLaunchSummary(launch),
    states: {
      executive: buildState({ empty }),
      operational: buildState({ empty }),
      charts: buildState({ empty }),
      tables: buildState({ empty })
    },
    executiveIndicators: [
      {
        key: "tasks-completed",
        label: "Tarefas concluidas",
        value: tasksCompleted,
        trend: previousSummary ? calculateTrend(tasksCompleted, previousSummary.tasksCompleted) : null
      },
      {
        key: "contents-published",
        label: "Conteudos publicados",
        value: contentsPublished,
        trend: previousSummary ? calculateTrend(contentsPublished, previousSummary.contentsPublished) : null
      },
      {
        key: "leads",
        label: "Leads",
        value: trafficSummary.leads,
        trend: previousSummary ? calculateTrend(trafficSummary.leads, previousSummary.leads) : null
      },
      {
        key: "revenue",
        label: "Receita",
        value: trafficSummary.revenue,
        trend: previousSummary ? calculateTrend(trafficSummary.revenue, previousSummary.revenue) : null
      },
      {
        key: "roas",
        label: "ROAS",
        value: roas,
        trend: previousSummary ? calculateTrend(roas, previousSummary.roas) : null
      }
    ],
    operationalIndicators: [
      {
        key: "tasks-delayed",
        label: "Tarefas atrasadas",
        value: tasksDelayed
      },
      {
        key: "conversions",
        label: "Conversoes",
        value: trafficSummary.conversions
      },
      {
        key: "cpl",
        label: "CPL",
        value: cpl
      },
      {
        key: "pending-approvals",
        label: "Aprovacoes pendentes",
        value: pendingApprovals
      },
      {
        key: "operational-progress",
        label: "Progresso operacional",
        value: operationalProgress
      }
    ],
    comparison: buildComparisonSummary(currentSummary, previousSummary),
    charts: {
      campaignsByStatus: {
        type: "bar",
        items: buildGroupedCounts(dataset.campaigns, (item) => item.status)
      },
      publicationsByChannel: {
        type: "donut",
        items: buildGroupedCounts(dataset.publications, (item) => item.channel)
      },
      approvalsByStatus: {
        type: "stacked-bar",
        items: buildGroupedCounts(dataset.approvals, (item) => item.currentStatus)
      },
      operationalByArea: {
        type: "bar",
        items: buildGroupedCounts(dataset.operationalItems, (item) => item.area)
      },
      trafficByCampaign: {
        type: "bar",
        items: buildSeries(
          dataset.campaigns.map((campaign) => ({
            label: campaign.name,
            value: dataset.snapshots
              .filter((snapshot) => snapshot.campaignId === campaign.id)
              .reduce((sum, snapshot) => sum + toNumber(snapshot.metrics?.revenue), 0)
          })),
          (item) => item.value
        )
      }
    },
    tables: {
      topCampaigns: dataset.campaigns
        .map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          channel: campaign.channel,
          status: campaign.status,
          revenue: dataset.snapshots
            .filter((snapshot) => snapshot.campaignId === campaign.id)
            .reduce((sum, snapshot) => sum + toNumber(snapshot.metrics?.revenue), 0),
          leads: dataset.snapshots
            .filter((snapshot) => snapshot.campaignId === campaign.id)
            .reduce((sum, snapshot) => sum + toNumber(snapshot.metrics?.clicks), 0)
        }))
        .sort((left, right) => right.revenue - left.revenue),
      delayedActivities: dataset.operationalItems
        .filter((item) => item.delayed)
        .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())
        .map((item) => ({
          id: item.id,
          title: item.title,
          responsible: item.responsible,
          area: item.area,
          dueAt: item.dueAt,
          status: item.status
        })),
      approvalQueue: dataset.approvals
        .filter((item) => item.currentStatus !== "APPROVED" && item.currentStatus !== "PUBLISHED")
        .map((item) => ({
          id: item.id,
          contentType: item.contentType,
          contentId: item.contentId,
          status: item.currentStatus,
          updatedAt: item.updatedAt ?? item.createdAt
        }))
    },
    availableActions: {
      export: ["CSV", "PDF", "XLSX"],
      print: true,
      saveView: true,
      createDashboard: true
    }
  };
}

async function loadDataset(filters) {
  const launchQuery = filters.launchId ? { launchId: filters.launchId, active: true } : { active: true };
  const [operationalItemsRaw, contentsRaw, publicationsRaw, approvalsRaw, campaignsRaw, snapshotsRaw] = await Promise.all([
    OperationalSchedule.find(launchQuery).sort({ dueAt: 1, startsAt: 1 }),
    ContentProduction.find(launchQuery).sort({ updatedAt: -1 }),
    Publication.find(launchQuery).sort({ publishAt: -1 }),
    ContentApproval.find(filters.launchId ? { launchId: filters.launchId, active: true } : { active: true }).sort({ updatedAt: -1 }),
    TrafficCampaign.find(launchQuery).sort({ periodStart: 1, name: 1 }),
    TrafficReportSnapshot.find(filters.launchId ? { launchId: filters.launchId, active: true } : { active: true }).sort({ syncedAt: -1 })
  ]);

  return {
    operationalItems: filterOperationalItems(operationalItemsRaw, filters),
    contents: filterContents(contentsRaw, filters),
    publications: filterPublications(publicationsRaw, filters),
    approvals: filterApprovals(approvalsRaw, filters),
    campaigns: filterCampaigns(campaignsRaw, filters),
    snapshots: filterSnapshots(snapshotsRaw, filters)
  };
}

class ReportsService {
  async getAnalytics(authenticatedUserId, rawFilters) {
    const filters = normalizeFilters(rawFilters);
    ensureValidPeriod(filters.periodStart, filters.periodEnd);

    if ((filters.comparePeriodStart && !filters.comparePeriodEnd) || (!filters.comparePeriodStart && filters.comparePeriodEnd)) {
      throw {
        statusCode: 400,
        message: "comparePeriodStart and comparePeriodEnd must be informed together"
      };
    }

    if (filters.comparePeriodStart || filters.comparePeriodEnd) {
      ensureValidPeriod(filters.comparePeriodStart, filters.comparePeriodEnd, "comparePeriod");
    }

    const launch = await resolveLaunch(filters);
    const dataset = await loadDataset(filters);
    let previousSummary = null;

    if (filters.comparePeriodStart && filters.comparePeriodEnd) {
      const comparisonDataset = await loadDataset({
        ...filters,
        periodStart: filters.comparePeriodStart,
        periodEnd: filters.comparePeriodEnd,
        comparePeriodStart: null,
        comparePeriodEnd: null
      });
      previousSummary = buildReportPayload(comparisonDataset, {
        ...filters,
        periodStart: filters.comparePeriodStart,
        periodEnd: filters.comparePeriodEnd,
        comparePeriodStart: null,
        comparePeriodEnd: null
      }, launch).executiveIndicators.reduce((accumulator, card) => ({ ...accumulator, [card.key.replace(/-([a-z])/g, (_, character) => character.toUpperCase())]: card.value }), {
        tasksDelayed: buildReportPayload(comparisonDataset, {
          ...filters,
          periodStart: filters.comparePeriodStart,
          periodEnd: filters.comparePeriodEnd,
          comparePeriodStart: null,
          comparePeriodEnd: null
        }, launch).operationalIndicators[0].value,
        conversions: buildReportPayload(comparisonDataset, {
          ...filters,
          periodStart: filters.comparePeriodStart,
          periodEnd: filters.comparePeriodEnd,
          comparePeriodStart: null,
          comparePeriodEnd: null
        }, launch).operationalIndicators[1].value,
        cpl: buildReportPayload(comparisonDataset, {
          ...filters,
          periodStart: filters.comparePeriodStart,
          periodEnd: filters.comparePeriodEnd,
          comparePeriodStart: null,
          comparePeriodEnd: null
        }, launch).operationalIndicators[2].value,
        operationalProgress: buildReportPayload(comparisonDataset, {
          ...filters,
          periodStart: filters.comparePeriodStart,
          periodEnd: filters.comparePeriodEnd,
          comparePeriodStart: null,
          comparePeriodEnd: null
        }, launch).operationalIndicators[4].value
      });
    }

    const report = buildReportPayload(dataset, filters, launch, previousSummary);

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "REPORTS_ANALYTICS_READ",
      targetType: "REPORTS",
      targetId: filters.launchId ?? "GLOBAL",
      context: {
        launchId: filters.launchId,
        channel: filters.channel,
        campaignId: filters.campaignId,
        status: filters.status,
        approvalStatus: filters.approvalStatus
      }
    });

    return report;
  }

  async exportAnalysis(authenticatedUserId, data) {
    const filters = normalizeFilters(data.filters);
    ensureValidPeriod(filters.periodStart, filters.periodEnd);
    const actionType = data.actionType.trim().toUpperCase();
    const format = data.format.trim().toUpperCase();

    const feedback = buildExportFeedback(actionType, format);

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "REPORTS_ANALYTICS_EXPORTED",
      targetType: "REPORTS_EXPORT",
      targetId: filters.launchId ?? "GLOBAL",
      context: {
        actionType,
        format,
        launchId: filters.launchId,
        periodStart: filters.periodStart,
        periodEnd: filters.periodEnd
      }
    });

    return {
      filters: buildAppliedRecut(filters),
      export: feedback
    };
  }

  async saveView(authenticatedUserId, data) {
    const filters = normalizeFilters(data.filters);
    ensureValidPeriod(filters.periodStart, filters.periodEnd);

    const view = await ReportView.create({
      name: data.name.trim(),
      description: normalizeText(data.description),
      type: data.type,
      ownerUserId: authenticatedUserId,
      filters,
      layout: {
        widgets: [...(data.layout?.widgets ?? [])],
        shared: data.layout?.shared ?? false
      },
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "REPORTS_VIEW_SAVED",
      targetType: "REPORT_VIEW",
      targetId: view.id,
      context: {
        type: view.type,
        shared: view.layout.shared
      }
    });

    return toPublicReportView(view);
  }

  async listViews(authenticatedUserId, type = null) {
    const query = {
      ownerUserId: authenticatedUserId,
      active: true
    };

    if (type) {
      query.type = type;
    }

    const views = await ReportView.find(query).sort({ updatedAt: -1, createdAt: -1 });

    return views.map((view) => toPublicReportView(view));
  }
}

export const reportsService = new ReportsService();

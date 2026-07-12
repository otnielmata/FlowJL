import { Avatar } from "../models/avatar.model.js";
import { CompetitorResearch } from "../models/competitor-research.model.js";
import { ContentPlan } from "../models/content-plan.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { ExpertApproval } from "../models/expert-approval.model.js";
import { Launch } from "../models/launch.model.js";
import { MarketResearch } from "../models/market-research.model.js";
import { Offer } from "../models/offer.model.js";
import { Positioning } from "../models/positioning.model.js";
import { SmartSchedule } from "../models/smart-schedule.model.js";

const strategyStepDefinitions = [
  { key: "marketResearch", label: "Pesquisa de mercado" },
  { key: "competitorResearch", label: "Pesquisa de concorrentes" },
  { key: "avatar", label: "Avatar" },
  { key: "offer", label: "Oferta" },
  { key: "positioning", label: "Posicionamento" },
  { key: "editorialLine", label: "Linha editorial" },
  { key: "contentPlan", label: "Plano de conteudo" },
  { key: "smartSchedule", label: "Cronograma inteligente" },
  { key: "expertApproval", label: "Aprovacao do expert" }
];

const completedActivityStatuses = new Set(["DONE", "COMPLETED", "APPROVED", "PUBLISHED"]);

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function hasCurrentEntity(entity) {
  return Boolean(entity);
}

function buildStepStatus(stepKey, entity) {
  if (stepKey === "expertApproval") {
    if (!entity) {
      return "PENDING";
    }

    if (entity.status === "APPROVED") {
      return "COMPLETED";
    }

    if (entity.status === "IN_REVIEW") {
      return "IN_REVIEW";
    }

    if (entity.status === "REJECTED") {
      return "REJECTED";
    }
  }

  return entity ? "COMPLETED" : "PENDING";
}

function getEntityUpdatedAt(entity) {
  return entity?.updatedAt ?? entity?.createdAt ?? null;
}

function toPublicStep(definition, entity) {
  return {
    key: definition.key,
    label: definition.label,
    status: buildStepStatus(definition.key, entity),
    version: entity?.version ?? null,
    updatedAt: getEntityUpdatedAt(entity)
  };
}

function isCompletedActivity(activity) {
  return completedActivityStatuses.has(activity.status.trim().toUpperCase());
}

function buildStageStatus(activities, now) {
  const grouped = new Map();

  for (const activity of activities) {
    const group = grouped.get(activity.stage) ?? [];
    group.push(activity);
    grouped.set(activity.stage, group);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([stage, groupedActivities]) => {
      const delayedActivities = groupedActivities.filter((activity) => !isCompletedActivity(activity) && normalizeDate(activity.dueAt) < now);
      const completedActivities = groupedActivities.filter((activity) => isCompletedActivity(activity));
      const pendingActivities = groupedActivities.length - completedActivities.length;
      const orderedDueDates = groupedActivities
        .map((activity) => normalizeDate(activity.dueAt))
        .filter((dueAt) => dueAt)
        .sort((left, right) => left.getTime() - right.getTime());

      let status = "PENDING";

      if (groupedActivities.length > 0 && pendingActivities === 0) {
        status = "COMPLETED";
      } else if (delayedActivities.length > 0) {
        status = "DELAYED";
      } else if (completedActivities.length > 0) {
        status = "IN_PROGRESS";
      }

      return {
        stage,
        status,
        totalActivities: groupedActivities.length,
        completedActivities: completedActivities.length,
        pendingActivities,
        delayedActivities: delayedActivities.length,
        progressPercentage: groupedActivities.length === 0 ? 0 : Math.round((completedActivities.length / groupedActivities.length) * 100),
        nextDueAt: orderedDueDates.find((dueAt) => dueAt >= now) ?? null,
        lastDueAt: orderedDueDates.at(-1) ?? null
      };
    });
}

function computeLaunchLastUpdatedAt(sources) {
  const orderedDates = sources
    .map((source) => getEntityUpdatedAt(source))
    .filter((value) => value)
    .sort((left, right) => right.getTime() - left.getTime());

  return orderedDates[0] ?? null;
}

function buildLaunchDashboard(launch, data, now) {
  const steps = strategyStepDefinitions.map((definition) => toPublicStep(definition, data[definition.key]));
  const completedSteps = steps.filter((step) => step.status === "COMPLETED").length;
  const stageStatus = buildStageStatus(data.smartSchedule?.activities ?? [], now);
  const totalActivities = data.smartSchedule?.activities.length ?? 0;
  const completedActivities = (data.smartSchedule?.activities ?? []).filter((activity) => isCompletedActivity(activity)).length;
  const delayedActivities = (data.smartSchedule?.activities ?? []).filter((activity) => !isCompletedActivity(activity) && normalizeDate(activity.dueAt) < now).length;
  const pendingSteps = steps.filter((step) => step.status !== "COMPLETED").length;
  const pendingActivities = totalActivities - completedActivities;

  return {
    launch: {
      id: launch.id,
      name: launch.name,
      expert: launch.expert,
      product: launch.product,
      baseDate: launch.baseDate,
      periodStart: launch.periodStart,
      periodEnd: launch.periodEnd
    },
    progressPercentage: Math.round((completedSteps / strategyStepDefinitions.length) * 100),
    pendingCount: pendingSteps + pendingActivities,
    delayedCount: delayedActivities,
    approvalStatus: data.expertApproval?.status ?? "PENDING",
    strategySteps: steps,
    stageStatus,
    metrics: {
      totalSteps: strategyStepDefinitions.length,
      completedSteps,
      totalActivities,
      completedActivities,
      pendingActivities,
      delayedActivities
    },
    lastUpdatedAt: computeLaunchLastUpdatedAt([launch, ...Object.values(data)])
  };
}

async function findLaunches(filterLaunchId) {
  if (filterLaunchId) {
    const launch = await Launch.findById(filterLaunchId);

    if (!launch || launch.active === false) {
      throw {
        statusCode: 404,
        message: "Launch not found"
      };
    }

    return [launch];
  }

  return Launch.find({ active: true }).sort({ baseDate: -1, createdAt: -1 });
}

async function loadLaunchData(launchId) {
  const [
    marketResearch,
    competitorResearchEntries,
    avatar,
    offer,
    positioning,
    editorialLine,
    contentPlan,
    smartSchedule,
    expertApproval
  ] = await Promise.all([
    MarketResearch.findOne({ launchId }).sort({ version: -1, createdAt: -1 }),
    CompetitorResearch.find({ launchId, active: true }).sort({ updatedAt: -1 }),
    Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Offer.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Positioning.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    EditorialLine.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    ContentPlan.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    SmartSchedule.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    ExpertApproval.findOne({ launchId, isCurrent: true }).sort({ version: -1 })
  ]);

  return {
    marketResearch,
    competitorResearch: competitorResearchEntries.length > 0 ? { updatedAt: competitorResearchEntries[0].updatedAt ?? competitorResearchEntries[0].createdAt } : null,
    avatar: hasCurrentEntity(avatar) ? avatar : null,
    offer: hasCurrentEntity(offer) ? offer : null,
    positioning: hasCurrentEntity(positioning) ? positioning : null,
    editorialLine: hasCurrentEntity(editorialLine) ? editorialLine : null,
    contentPlan: hasCurrentEntity(contentPlan) ? contentPlan : null,
    smartSchedule: hasCurrentEntity(smartSchedule) ? smartSchedule : null,
    expertApproval: hasCurrentEntity(expertApproval) ? expertApproval : null
  };
}

class DashboardService {
  async getStrategistDashboard(filters = {}) {
    const launches = await findLaunches(filters.launchId);
    const now = new Date();
    const items = [];

    for (const launch of launches) {
      const data = await loadLaunchData(launch.id);
      items.push(buildLaunchDashboard(launch, data, now));
    }

    const summary = {
      totalLaunches: items.length,
      averageProgressPercentage: items.length === 0 ? 0 : Math.round(items.reduce((accumulator, item) => accumulator + item.progressPercentage, 0) / items.length),
      pendingCount: items.reduce((accumulator, item) => accumulator + item.pendingCount, 0),
      delayedCount: items.reduce((accumulator, item) => accumulator + item.delayedCount, 0),
      approvedLaunches: items.filter((item) => item.approvalStatus === "APPROVED").length,
      launchesInReview: items.filter((item) => item.approvalStatus === "IN_REVIEW").length
    };

    return {
      generatedAt: now,
      filters: {
        launchId: filters.launchId ?? null
      },
      summary,
      items
    };
  }
}

export const dashboardService = new DashboardService();

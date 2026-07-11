import { ContentPlan } from "../models/content-plan.model.js";
import { Launch } from "../models/launch.model.js";
import { SmartSchedule } from "../models/smart-schedule.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return new Date(value);
}

function toPublicActivity(activity) {
  return {
    id: activity.id,
    theme: activity.theme,
    objective: activity.objective,
    stage: activity.stage,
    deliveryType: activity.deliveryType,
    area: activity.area,
    suggestedResponsibleRole: activity.suggestedResponsibleRole,
    dueAt: activity.dueAt,
    status: activity.status
  };
}

function groupActivities(activities) {
  const byStage = new Map();
  const byStatus = new Map();

  for (const activity of activities) {
    if (!byStage.has(activity.stage)) {
      byStage.set(activity.stage, []);
    }
    byStage.get(activity.stage).push(activity);

    if (!byStatus.has(activity.status)) {
      byStatus.set(activity.status, []);
    }
    byStatus.get(activity.status).push(activity);
  }

  const mapGroup = (entries, keyName) =>
    [...entries.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, groupedItems]) => ({
      [keyName]: key,
      activities: groupedItems
        .slice()
        .sort((left, right) => normalizeDate(left.dueAt).getTime() - normalizeDate(right.dueAt).getTime())
        .map((activity) => toPublicActivity(activity))
    }));

  return {
    byStage: mapGroup(byStage, "stage"),
    byStatus: mapGroup(byStatus, "status")
  };
}

function toPublicSmartSchedule(schedule) {
  const activities = schedule.activities.map((activity) => toPublicActivity(activity));

  return {
    id: schedule.id,
    launchId: schedule.launchId,
    version: schedule.version,
    objective: schedule.objective,
    periodStart: schedule.periodStart,
    periodEnd: schedule.periodEnd,
    operationalCadenceDays: schedule.operationalCadenceDays,
    contentPlanVersion: schedule.contentPlanVersion ?? null,
    activities,
    grouped: groupActivities(schedule.activities),
    isCurrent: schedule.isCurrent,
    active: schedule.active,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
    createdBy: schedule.createdBy ?? null,
    updatedBy: schedule.updatedBy ?? null
  };
}

async function findLaunchOrThrow(launchId) {
  const launch = await Launch.findById(launchId);

  if (!launch) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return launch;
}

async function findContentPlanOrThrow(launchId) {
  const contentPlan = await ContentPlan.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

  if (!contentPlan) {
    throw {
      statusCode: 400,
      message: "Smart schedule requires a content plan"
    };
  }

  return contentPlan;
}

function inferAreaAndRole(item) {
  const format = item.format.toLowerCase();
  const objective = item.objective.toLowerCase();

  if (format.includes("video") || format.includes("reel") || format.includes("carrossel") || format.includes("post")) {
    return {
      area: "Social Media",
      suggestedResponsibleRole: "SOCIAL_MEDIA"
    };
  }

  if (objective.includes("trafego") || objective.includes("conversao")) {
    return {
      area: "Trafego",
      suggestedResponsibleRole: "TRAFFIC_MANAGER"
    };
  }

  return {
    area: "Operacoes",
    suggestedResponsibleRole: "OPERATIONS"
  };
}

function buildActivities(contentPlan, launch, data) {
  const normalizedStart = normalizeDate(data.periodStart);
  const normalizedEnd = normalizeDate(data.periodEnd);
  const cadenceDays = data.operationalCadenceDays ?? 2;
  const matchingItems = contentPlan.items.filter((item) => item.active && item.objective.toLowerCase() === data.objective.trim().toLowerCase());
  const sourceItems = matchingItems.length > 0 ? matchingItems : contentPlan.items.filter((item) => item.active);
  const milestoneDates = launch.milestones
    .map((milestone) => normalizeDate(milestone.scheduledAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  return sourceItems.map((item, index) => {
    const baseDate = milestoneDates[index % Math.max(milestoneDates.length, 1)] ?? normalizedStart;
    const generatedDueAt = new Date(baseDate.getTime() + cadenceDays * 24 * 60 * 60 * 1000 * index);
    const dueAt = generatedDueAt > normalizedEnd ? normalizedEnd : generatedDueAt;
    const assignment = inferAreaAndRole(item);

    return {
      theme: item.theme,
      objective: item.objective,
      stage: item.stage,
      deliveryType: item.format,
      area: assignment.area,
      suggestedResponsibleRole: assignment.suggestedResponsibleRole,
      dueAt,
      status: "PLANNED"
    };
  });
}

function normalizeActivities(activities) {
  return activities.map((activity) => ({
    theme: activity.theme.trim(),
    objective: activity.objective.trim(),
    stage: activity.stage.trim(),
    deliveryType: activity.deliveryType.trim(),
    area: activity.area.trim(),
    suggestedResponsibleRole: activity.suggestedResponsibleRole.trim(),
    dueAt: normalizeDate(activity.dueAt),
    status: activity.status.trim()
  }));
}

class SmartScheduleService {
  async create(authenticatedUserId, launchId, data) {
    const launch = await findLaunchOrThrow(launchId);
    const existingCurrentSchedule = await SmartSchedule.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (existingCurrentSchedule) {
      throw {
        statusCode: 409,
        message: "A current smart schedule already exists for this launch"
      };
    }

    const contentPlan = await findContentPlanOrThrow(launchId);
    const activities = buildActivities(contentPlan, launch, data);

    const schedule = await SmartSchedule.create({
      launchId,
      version: 1,
      objective: data.objective.trim(),
      periodStart: normalizeDate(data.periodStart),
      periodEnd: normalizeDate(data.periodEnd),
      operationalCadenceDays: data.operationalCadenceDays ?? 2,
      contentPlanVersion: contentPlan.version,
      activities,
      isCurrent: true,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "SMART_SCHEDULE_CREATED",
      targetType: "SMART_SCHEDULE",
      targetId: schedule.id,
      context: {
        launchId,
        version: schedule.version,
        activities: schedule.activities.length
      }
    });

    return toPublicSmartSchedule(schedule);
  }

  async update(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const currentSchedule = await SmartSchedule.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (!currentSchedule) {
      throw {
        statusCode: 404,
        message: "Smart schedule not found"
      };
    }

    const contentPlan = await findContentPlanOrThrow(launchId);

    await SmartSchedule.updateOne(
      { _id: currentSchedule.id },
      {
        $set: {
          isCurrent: false,
          active: false,
          updatedBy: authenticatedUserId
        }
      }
    );

    const schedule = await SmartSchedule.create({
      launchId,
      version: currentSchedule.version + 1,
      objective: data.objective.trim(),
      periodStart: normalizeDate(data.periodStart),
      periodEnd: normalizeDate(data.periodEnd),
      operationalCadenceDays: data.operationalCadenceDays,
      contentPlanVersion: contentPlan.version,
      activities: normalizeActivities(data.activities),
      isCurrent: true,
      active: true,
      createdBy: currentSchedule.createdBy ?? authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "SMART_SCHEDULE_UPDATED",
      targetType: "SMART_SCHEDULE",
      targetId: schedule.id,
      context: {
        launchId,
        version: schedule.version,
        previousVersion: currentSchedule.version,
        activities: schedule.activities.length
      }
    });

    return toPublicSmartSchedule(schedule);
  }
}

export const smartScheduleService = new SmartScheduleService();
export { toPublicSmartSchedule };

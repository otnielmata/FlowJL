import { AiSchedule } from "../models/ai-schedule.model.js";
import { ClassSchedule } from "../models/class-schedule.model.js";
import { ContentPlan } from "../models/content-plan.model.js";
import { Launch } from "../models/launch.model.js";
import { LiveEvent } from "../models/live-event.model.js";
import { OperationalChecklist } from "../models/operational-checklist.model.js";
import { SmartSchedule } from "../models/smart-schedule.model.js";
import { SupportTicket } from "../models/support-ticket.model.js";
import { auditService } from "./audit.service.js";
import { aiScheduleGeneratorService } from "./ai-schedule-generator.service.js";

function normalizeText(value) {
  return value.trim();
}

function normalizeDate(value) {
  return new Date(value);
}

function normalizeActivities(activities = []) {
  return activities.map((activity) => ({
    id: activity.id,
    title: normalizeText(activity.title),
    stage: normalizeText(activity.stage),
    area: normalizeText(activity.area),
    suggestedResponsibleRole: normalizeText(activity.suggestedResponsibleRole),
    dueAt: normalizeDate(activity.dueAt),
    dependencies: (activity.dependencies ?? []).map((dependency) => normalizeText(dependency)),
    reviewNotes: (activity.reviewNotes ?? []).map((note) => normalizeText(note))
  }));
}

function normalizePhases(phases = []) {
  return phases.map((phase) => ({
    name: normalizeText(phase.name),
    objective: normalizeText(phase.objective),
    startsAt: normalizeDate(phase.startsAt),
    endsAt: normalizeDate(phase.endsAt),
    activities: normalizeActivities(phase.activities)
  }));
}

function toPlainInternalSignals(sourceContext) {
  if (!sourceContext?.internalSignals) {
    return {};
  }

  if (sourceContext.internalSignals instanceof Map) {
    return Object.fromEntries(sourceContext.internalSignals.entries());
  }

  return { ...sourceContext.internalSignals };
}

function toPublicAiSchedule(schedule) {
  return {
    id: schedule.id,
    launchId: schedule.launchId,
    objective: schedule.objective,
    briefing: schedule.briefing,
    periodStart: schedule.periodStart,
    periodEnd: schedule.periodEnd,
    phases: schedule.phases.map((phase) => ({
      name: phase.name,
      objective: phase.objective,
      startsAt: phase.startsAt,
      endsAt: phase.endsAt,
      activities: phase.activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        stage: activity.stage,
        area: activity.area,
        suggestedResponsibleRole: activity.suggestedResponsibleRole,
        dueAt: activity.dueAt,
        dependencies: [...(activity.dependencies ?? [])],
        reviewNotes: [...(activity.reviewNotes ?? [])]
      }))
    })),
    reviewNotes: [...(schedule.reviewNotes ?? [])],
    sourceContext: {
      launchId: schedule.sourceContext.launchId,
      launchName: schedule.sourceContext.launchName,
      product: schedule.sourceContext.product,
      expert: schedule.sourceContext.expert,
      contentPlanVersion: schedule.sourceContext.contentPlanVersion ?? null,
      smartScheduleVersion: schedule.sourceContext.smartScheduleVersion ?? null,
      internalSignals: toPlainInternalSignals(schedule.sourceContext)
    },
    generatedByAI: schedule.generatedByAI,
    humanReviewRequired: schedule.humanReviewRequired,
    reviewStatus: schedule.reviewStatus,
    active: schedule.active,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
    createdBy: schedule.createdBy ?? null,
    updatedBy: schedule.updatedBy ?? null
  };
}

async function findLaunchOrThrow(launchId) {
  const launch = await Launch.findById(launchId);

  if (!launch || launch.active === false) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return launch;
}

async function findContext(launchId) {
  const [contentPlan, smartSchedule, classSchedules, liveEvents, operationalChecklists, supportTickets] = await Promise.all([
    ContentPlan.findOne({ launchId, isCurrent: true, active: true }).sort({ version: -1 }),
    SmartSchedule.findOne({ launchId, isCurrent: true, active: true }).sort({ version: -1 }),
    ClassSchedule.find({ launchId, active: true }),
    LiveEvent.find({ launchId, active: true }),
    OperationalChecklist.find({ contextId: launchId, operationType: "LAUNCH", active: true }),
    SupportTicket.find({ launchId, active: true })
  ]);

  return {
    contentPlan,
    smartSchedule,
    classSchedules,
    liveEvents,
    operationalChecklists,
    supportTickets
  };
}

function ensureMinimumContext(launch, briefing, context) {
  const hasBriefing = briefing.trim().length >= 30;
  const hasLaunchMilestones = (launch.milestones ?? []).length >= 2;
  const hasHistoricalContext = Boolean(context.contentPlan || context.smartSchedule);

  if (!hasBriefing || (!hasLaunchMilestones && !hasHistoricalContext)) {
    throw {
      statusCode: 400,
      message: "AI schedule generation requires launch briefing and minimum operational context"
    };
  }
}

function buildSourceContext(launch, context) {
  return {
    launchId: launch.id,
    launchName: launch.name,
    product: launch.product,
    expert: launch.expert,
    contentPlanVersion: context.contentPlan?.version ?? null,
    smartScheduleVersion: context.smartSchedule?.version ?? null,
    internalSignals: {
      milestonesCount: launch.milestones?.length ?? 0,
      contentPlanItemsCount: context.contentPlan?.items?.filter((item) => item.active).length ?? 0,
      smartScheduleActivitiesCount: context.smartSchedule?.activities?.length ?? 0,
      classSchedulesCount: context.classSchedules.length,
      liveEventsCount: context.liveEvents.length,
      operationalChecklistsCount: context.operationalChecklists.length,
      supportTicketsCount: context.supportTickets.length
    }
  };
}

class AiScheduleService {
  async generate(authenticatedUserId, launchId, data) {
    const launch = await findLaunchOrThrow(launchId);
    const briefing = normalizeText(data.briefing);
    const objective = normalizeText(data.objective);
    const context = await findContext(launchId);
    ensureMinimumContext(launch, briefing, context);

    const sourceContext = buildSourceContext(launch, context);
    const suggestion = aiScheduleGeneratorService.generate({
      launch,
      objective,
      briefing,
      sourceContext,
      contentPlan: context.contentPlan,
      smartSchedule: context.smartSchedule
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_SCHEDULE_GENERATED",
      targetType: "LAUNCH",
      targetId: launch.id,
      context: {
        launchId,
        objective,
        contentPlanVersion: sourceContext.contentPlanVersion,
        smartScheduleVersion: sourceContext.smartScheduleVersion
      }
    });

    return {
      launchId,
      objective,
      briefing,
      sourceContext,
      suggestion,
      humanReviewRequired: true
    };
  }

  async create(authenticatedUserId, data) {
    await findLaunchOrThrow(data.launchId);

    if (data.sourceContext.launchId !== data.launchId) {
      throw {
        statusCode: 400,
        message: "AI schedule source context must match the launch"
      };
    }

    const schedule = await AiSchedule.create({
      launchId: data.launchId,
      objective: normalizeText(data.objective),
      briefing: normalizeText(data.briefing),
      periodStart: normalizeDate(data.periodStart),
      periodEnd: normalizeDate(data.periodEnd),
      phases: normalizePhases(data.phases),
      reviewNotes: (data.reviewNotes ?? []).map((note) => normalizeText(note)),
      sourceContext: {
        ...data.sourceContext,
        internalSignals: { ...data.sourceContext.internalSignals }
      },
      generatedByAI: true,
      humanReviewRequired: true,
      reviewStatus: "PENDING_REVIEW",
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_SCHEDULE_SAVED",
      targetType: "AI_SCHEDULE",
      targetId: schedule.id,
      context: {
        launchId: schedule.launchId,
        reviewStatus: schedule.reviewStatus,
        contentPlanVersion: schedule.sourceContext.contentPlanVersion ?? null,
        smartScheduleVersion: schedule.sourceContext.smartScheduleVersion ?? null
      }
    });

    return toPublicAiSchedule(schedule);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.reviewStatus) {
      query.reviewStatus = filters.reviewStatus;
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    } else {
      query.active = true;
    }

    const schedules = await AiSchedule.find(query).sort({ createdAt: -1 });
    return schedules.map((schedule) => toPublicAiSchedule(schedule));
  }

  async getById(scheduleId) {
    const schedule = await AiSchedule.findById(scheduleId);

    if (!schedule) {
      throw {
        statusCode: 404,
        message: "AI schedule not found"
      };
    }

    return toPublicAiSchedule(schedule);
  }
}

export const aiScheduleService = new AiScheduleService();
export { toPublicAiSchedule };

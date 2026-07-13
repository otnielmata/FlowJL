import { ClassSchedule } from "../models/class-schedule.model.js";
import { Launch } from "../models/launch.model.js";
import { LiveEvent } from "../models/live-event.model.js";
import { OperationalChecklist } from "../models/operational-checklist.model.js";
import { operationalScheduleService } from "./operational-schedule.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function cloneChecklistItems(items = []) {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    required: item.required,
    completed: item.completed,
    completedBy: item.completedBy ?? null,
    completedAt: item.completedAt ?? null,
    notes: item.notes ?? null
  }));
}

function buildSummary(items, now = new Date()) {
  return {
    total: items.length,
    delayed: items.filter((item) => item.state === "DELAYED").length,
    pending: items.filter((item) => ["BACKLOG", "PLANNED", "BLOCKED"].includes(item.status)).length,
    inProgress: items.filter((item) => item.status === "IN_PROGRESS").length,
    completed: items.filter((item) => item.status === "DONE").length,
    critical: items.filter((item) => item.priority === "CRITICAL").length,
    upcoming: items.filter((item) => item.startsAt && item.startsAt.getTime() >= now.getTime()).length
  };
}

async function resolveLaunchMap(launchIds) {
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

function toChecklistProjection(checklist) {
  return {
    id: checklist.id,
    title: checklist.title,
    status: checklist.status,
    completedAt: checklist.completedAt ?? null,
    items: cloneChecklistItems(checklist.items)
  };
}

class OperationsManagementService {
  async list(filters = {}) {
    const scheduleResponse = await operationalScheduleService.list(filters);
    const schedules = scheduleResponse.items;
    const launchMap = await resolveLaunchMap([...new Set(schedules.map((schedule) => schedule.launchId))]);
    const checklistIds = [...new Set(schedules.map((schedule) => schedule.relationships?.checklistId).filter(Boolean))];
    const classScheduleIds = [...new Set(schedules.map((schedule) => schedule.relationships?.classScheduleId).filter(Boolean))];
    const liveEventIds = [...new Set(schedules.map((schedule) => schedule.relationships?.liveEventId).filter(Boolean))];
    const [checklists, classSchedules, liveEvents] = await Promise.all([
      checklistIds.length > 0 ? OperationalChecklist.find({ _id: { $in: checklistIds }, active: true }) : [],
      classScheduleIds.length > 0 ? ClassSchedule.find({ _id: { $in: classScheduleIds }, active: true }) : [],
      liveEventIds.length > 0 ? LiveEvent.find({ _id: { $in: liveEventIds }, active: true }) : []
    ]);

    const checklistMap = new Map(checklists.map((checklist) => [checklist.id, toChecklistProjection(checklist)]));
    const classScheduleMap = new Map(
      classSchedules.map((classSchedule) => [
        classSchedule.id,
        {
          id: classSchedule.id,
          title: classSchedule.title,
          scheduledAt: classSchedule.scheduledAt,
          responsible: classSchedule.responsible,
          status: classSchedule.status
        }
      ])
    );
    const liveEventMap = new Map(
      liveEvents.map((liveEvent) => [
        liveEvent.id,
        {
          id: liveEvent.id,
          name: liveEvent.name,
          scheduledAt: liveEvent.scheduledAt,
          responsible: liveEvent.responsible,
          status: liveEvent.status,
          channel: liveEvent.channel
        }
      ])
    );

    const items = schedules.map((schedule) => ({
      ...schedule,
      context: {
        launch: launchMap.get(schedule.launchId) ?? null,
        checklist: schedule.relationships?.checklistId ? checklistMap.get(schedule.relationships.checklistId) ?? null : null,
        classSchedule: schedule.relationships?.classScheduleId ? classScheduleMap.get(schedule.relationships.classScheduleId) ?? null : null,
        liveEvent: schedule.relationships?.liveEventId ? liveEventMap.get(schedule.relationships.liveEventId) ?? null : null
      }
    }));

    return {
      filters: {
        launchId: filters.launchId ?? null,
        responsible: filters.responsible ?? null,
        area: filters.area ?? null,
        priority: filters.priority ?? null,
        status: filters.status ?? null,
        type: filters.type ?? null,
        startAt: filters.startAt ? normalizeDate(filters.startAt) : null,
        endAt: filters.endAt ? normalizeDate(filters.endAt) : null,
        view: filters.view ?? "LIST"
      },
      summary: buildSummary(items),
      projection: scheduleResponse.projection,
      availableViews: scheduleResponse.availableViews,
      items
    };
  }

  async createActivity(authenticatedUserId, data) {
    return operationalScheduleService.create(authenticatedUserId, data);
  }

  async updateActivity(authenticatedUserId, activityId, data) {
    return operationalScheduleService.update(authenticatedUserId, activityId, data);
  }

  async recordExecution(authenticatedUserId, activityId, data) {
    return operationalScheduleService.recordExecution(authenticatedUserId, activityId, data);
  }
}

export const operationsManagementService = new OperationsManagementService();

import { randomUUID } from "node:crypto";

import { ClassSchedule } from "../models/class-schedule.model.js";
import { Launch } from "../models/launch.model.js";
import { LiveEvent } from "../models/live-event.model.js";
import { OperationalChecklist } from "../models/operational-checklist.model.js";
import {
  OperationalSchedule,
  operationalScheduleRecurrenceFrequencies,
  operationalSchedulePriorities,
  operationalScheduleStatuses,
  operationalScheduleViews
} from "../models/operational-schedule.model.js";
import { auditService } from "./audit.service.js";

const doneStatuses = new Set(["DONE", "CANCELED"]);

function normalizeDate(value) {
  return new Date(value);
}

function normalizeNullableString(value) {
  return value?.trim() ?? null;
}

function normalizeStringArray(values = []) {
  return values.map((value) => value.trim());
}

function normalizeRecurrence(recurrence = {}, current = {}) {
  const frequency = recurrence.frequency ?? current.frequency ?? "NONE";

  if (!operationalScheduleRecurrenceFrequencies.includes(frequency)) {
    throw {
      statusCode: 400,
      message: "Unsupported recurrence frequency"
    };
  }

  return {
    frequency,
    interval: recurrence.interval ?? current.interval ?? 1,
    count: recurrence.count ?? current.count ?? null,
    until: recurrence.until !== undefined ? normalizeDate(recurrence.until) : current.until ?? null
  };
}

function normalizeReminder(reminder = {}, current = {}) {
  return {
    enabled: reminder.enabled ?? current.enabled ?? false,
    remindAt: reminder.remindAt !== undefined ? normalizeDate(reminder.remindAt) : current.remindAt ?? null,
    channel: reminder.channel !== undefined ? normalizeNullableString(reminder.channel) : current.channel ?? null
  };
}

function normalizeRelationships(relationships = {}, current = {}) {
  return {
    checklistId: relationships.checklistId !== undefined ? relationships.checklistId : current.checklistId ?? null,
    classScheduleId: relationships.classScheduleId !== undefined ? relationships.classScheduleId : current.classScheduleId ?? null,
    liveEventId: relationships.liveEventId !== undefined ? relationships.liveEventId : current.liveEventId ?? null,
    relatedLink: relationships.relatedLink !== undefined ? normalizeNullableString(relationships.relatedLink) : current.relatedLink ?? null
  };
}

function normalizeAttendance(attendance = {}, current = {}) {
  const present = attendance.present ?? current.present ?? false;

  return {
    present,
    checkedBy: present ? attendance.checkedBy ?? current.checkedBy ?? null : null,
    checkedAt: present ? attendance.checkedAt ?? current.checkedAt ?? new Date() : null
  };
}

function buildExecutionHistoryEntry(actionType, actorUserId, message, metadata = {}, fromStatus = null, toStatus = null) {
  return {
    id: randomUUID(),
    actionType,
    fromStatus,
    toStatus,
    actorUserId,
    message,
    metadata,
    createdAt: new Date()
  };
}

function normalizeChecklistItem(item, authenticatedUserId, now = new Date()) {
  const completed = item.completed ?? false;

  return {
    id: item.id ?? randomUUID(),
    label: item.label.trim(),
    required: item.required ?? true,
    completed,
    completedBy: completed ? authenticatedUserId : null,
    completedAt: completed ? now : null
  };
}

function normalizeAttachment(attachment) {
  return {
    id: attachment.id ?? randomUUID(),
    name: attachment.name.trim(),
    url: attachment.url.trim(),
    mediaType: normalizeNullableString(attachment.mediaType)
  };
}

function normalizeComment(comment) {
  return {
    id: comment.id ?? randomUUID(),
    authorUserId: comment.authorUserId.trim(),
    authorName: comment.authorName.trim(),
    message: comment.message.trim(),
    createdAt: normalizeDate(comment.createdAt)
  };
}

function statusOrder(status) {
  return operationalScheduleStatuses.indexOf(status);
}

function priorityOrder(priority) {
  return operationalSchedulePriorities.indexOf(priority);
}

function isDelayed(schedule, now = new Date()) {
  return !doneStatuses.has(schedule.status) && normalizeDate(schedule.dueAt).getTime() < now.getTime();
}

function buildConflictIndex(schedules) {
  const grouped = new Map();

  for (const schedule of schedules) {
    const key = `${schedule.responsible}:${schedule.startsAt.toISOString()}:${schedule.dueAt.toISOString()}`;
    const current = grouped.get(key) ?? [];
    current.push(schedule.id);
    grouped.set(key, current);
  }

  return grouped;
}

function cloneChecklist(checklist = []) {
  return checklist.map((item) => ({
    id: item.id,
    label: item.label,
    required: item.required,
    completed: item.completed,
    completedBy: item.completedBy ?? null,
    completedAt: item.completedAt ?? null
  }));
}

function cloneAttachments(attachments = []) {
  return attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
    mediaType: attachment.mediaType ?? null
  }));
}

function cloneComments(comments = []) {
  return comments.map((comment) => ({
    id: comment.id,
    authorUserId: comment.authorUserId,
    authorName: comment.authorName,
    message: comment.message,
    createdAt: comment.createdAt
  }));
}

function cloneExecutionHistory(history = []) {
  return history.map((entry) => ({
    id: entry.id,
    actionType: entry.actionType,
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus ?? null,
    actorUserId: entry.actorUserId ?? null,
    message: entry.message,
    metadata: entry.metadata ?? {},
    createdAt: entry.createdAt
  }));
}

function buildStatusLabel(status) {
  return status
    .split("_")
    .map((chunk) => chunk.charAt(0) + chunk.slice(1).toLowerCase())
    .join(" ");
}

function toPublicOperationalSchedule(schedule, dependencies = [], conflictIndex = new Map(), now = new Date()) {
  const delayed = isDelayed(schedule, now);
  const conflictKey = `${schedule.responsible}:${schedule.startsAt.toISOString()}:${schedule.dueAt.toISOString()}`;
  const overlappingIds = (conflictIndex.get(conflictKey) ?? []).filter((id) => id !== schedule.id);

  return {
    id: schedule.id,
    launchId: schedule.launchId,
    title: schedule.title,
    description: schedule.description ?? null,
    area: schedule.area,
    priority: schedule.priority,
    status: schedule.status,
    statusLabel: buildStatusLabel(schedule.status),
    type: schedule.type,
    responsible: schedule.responsible,
    startsAt: schedule.startsAt,
    dueAt: schedule.dueAt,
    timelinePosition: schedule.timelinePosition,
    dependencyIds: [...(schedule.dependencyIds ?? [])],
    dependencies: dependencies.map((dependency) => ({
      id: dependency.id,
      title: dependency.title,
      status: dependency.status,
      dueAt: dependency.dueAt
    })),
    checklist: cloneChecklist(schedule.checklist),
    attachments: cloneAttachments(schedule.attachments),
    comments: cloneComments(schedule.comments),
    tags: [...(schedule.tags ?? [])],
    recurrence: {
      frequency: schedule.recurrence?.frequency ?? "NONE",
      interval: schedule.recurrence?.interval ?? 1,
      count: schedule.recurrence?.count ?? null,
      until: schedule.recurrence?.until ?? null
    },
    reminder: {
      enabled: schedule.reminder?.enabled ?? false,
      remindAt: schedule.reminder?.remindAt ?? null,
      channel: schedule.reminder?.channel ?? null
    },
    relationships: {
      checklistId: schedule.relationships?.checklistId ?? null,
      classScheduleId: schedule.relationships?.classScheduleId ?? null,
      liveEventId: schedule.relationships?.liveEventId ?? null,
      relatedLink: schedule.relationships?.relatedLink ?? null
    },
    attendance: {
      present: schedule.attendance?.present ?? false,
      checkedBy: schedule.attendance?.checkedBy ?? null,
      checkedAt: schedule.attendance?.checkedAt ?? null
    },
    executionHistory: cloneExecutionHistory(schedule.executionHistory),
    indicators: {
      delayed,
      hasConflict: overlappingIds.length > 0,
      conflictCount: overlappingIds.length,
      completionRate: schedule.checklist.length === 0 ? 0 : Math.round((schedule.checklist.filter((item) => item.completed).length / schedule.checklist.length) * 100),
      reminderEnabled: schedule.reminder?.enabled ?? false,
      hasRecurrence: (schedule.recurrence?.frequency ?? "NONE") !== "NONE",
      attendanceMarked: schedule.attendance?.present ?? false
    },
    state: delayed ? "DELAYED" : overlappingIds.length > 0 ? "CONFLICT" : schedule.status === "BLOCKED" ? "PENDING" : "HEALTHY",
    active: schedule.active,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
    createdBy: schedule.createdBy ?? null,
    updatedBy: schedule.updatedBy ?? null
  };
}

function buildCalendarGroups(schedules) {
  const groups = new Map();

  for (const schedule of schedules) {
    const key = schedule.startsAt.toISOString().slice(0, 10);
    const current = groups.get(key) ?? [];
    current.push(schedule);
    groups.set(key, current);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, items]) => ({
      date,
      items: items
        .slice()
        .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime() || left.timelinePosition - right.timelinePosition)
    }));
}

function buildKanbanColumns(schedules) {
  return operationalScheduleStatuses.map((status) => ({
    status,
    label: buildStatusLabel(status),
    items: schedules
      .filter((schedule) => schedule.status === status)
      .slice()
      .sort((left, right) => left.timelinePosition - right.timelinePosition || left.startsAt.getTime() - right.startsAt.getTime())
  }));
}

function buildTimeline(schedules) {
  const sorted = schedules
    .slice()
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime() || left.timelinePosition - right.timelinePosition);

  return {
    range: {
      startAt: sorted[0]?.startsAt ?? null,
      endAt: sorted[sorted.length - 1]?.dueAt ?? null
    },
    items: sorted
  };
}

function buildViewPayload(view, schedules) {
  switch (view) {
    case "MONTH":
    case "WEEK":
    case "DAY":
      return {
        type: "calendar",
        granularity: view,
        groups: buildCalendarGroups(schedules)
      };
    case "KANBAN":
      return {
        type: "kanban",
        columns: buildKanbanColumns(schedules)
      };
    case "TIMELINE":
      return {
        type: "timeline",
        ...buildTimeline(schedules)
      };
    case "LIST":
    default:
      return {
        type: "list",
        items: schedules
          .slice()
          .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime() || priorityOrder(right.priority) - priorityOrder(left.priority))
      };
  }
}

async function ensureLaunchExists(launchId) {
  const launch = await Launch.findById(launchId);

  if (!launch || launch.active === false) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }
}

async function ensureRelatedContexts(launchId, relationships) {
  if (relationships.classScheduleId) {
    const classSchedule = await ClassSchedule.findById(relationships.classScheduleId);

    if (!classSchedule || !classSchedule.active || classSchedule.launchId !== launchId) {
      throw {
        statusCode: 404,
        message: "Class schedule relationship not found"
      };
    }
  }

  if (relationships.liveEventId) {
    const liveEvent = await LiveEvent.findById(relationships.liveEventId);

    if (!liveEvent || !liveEvent.active || liveEvent.launchId !== launchId) {
      throw {
        statusCode: 404,
        message: "Live event relationship not found"
      };
    }
  }

  if (relationships.checklistId) {
    const checklist = await OperationalChecklist.findById(relationships.checklistId);

    if (!checklist || !checklist.active) {
      throw {
        statusCode: 404,
        message: "Operational checklist relationship not found"
      };
    }
  }
}

function validateScheduleDates(startsAt, dueAt) {
  if (startsAt.getTime() > dueAt.getTime()) {
    throw {
      statusCode: 400,
      message: "startsAt must be before or equal to dueAt"
    };
  }
}

async function resolveDependencies(launchId, dependencyIds, ignoredActivityIds = []) {
  if (!dependencyIds?.length) {
    return [];
  }

  const dependencies = await OperationalSchedule.find({
    _id: { $in: dependencyIds.filter((dependencyId) => !ignoredActivityIds.includes(dependencyId)) },
    launchId,
    active: true
  }).sort({ dueAt: 1, startsAt: 1 });

  if (dependencies.length !== dependencyIds.filter((dependencyId) => !ignoredActivityIds.includes(dependencyId)).length) {
    throw {
      statusCode: 404,
      message: "Dependency activity not found"
    };
  }

  return dependencies;
}

function enforceDependencyWindow(startsAt, dependencies) {
  const latestDependencyDueAt = dependencies
    .map((dependency) => normalizeDate(dependency.dueAt).getTime())
    .sort((left, right) => right - left)[0];

  if (latestDependencyDueAt !== undefined && startsAt.getTime() < latestDependencyDueAt) {
    throw {
      statusCode: 409,
      message: "Activity cannot start before its dependencies are due"
    };
  }
}

async function buildScheduleMap(scheduleIds) {
  const schedules = await OperationalSchedule.find({
    _id: { $in: scheduleIds },
    active: true
  }).sort({ startsAt: 1, dueAt: 1 });

  const map = new Map(schedules.map((schedule) => [schedule.id, schedule]));

  if (map.size !== scheduleIds.length) {
    throw {
      statusCode: 404,
      message: "Operational schedule activity not found"
    };
  }

  return map;
}

class OperationalScheduleService {
  async create(authenticatedUserId, data) {
    await ensureLaunchExists(data.launchId);

    const startsAt = normalizeDate(data.startsAt);
    const dueAt = normalizeDate(data.dueAt);
    validateScheduleDates(startsAt, dueAt);

    const dependencies = await resolveDependencies(data.launchId, data.dependencyIds ?? []);
    enforceDependencyWindow(startsAt, dependencies);
    const recurrence = normalizeRecurrence(data.recurrence);
    const reminder = normalizeReminder(data.reminder);
    const relationships = normalizeRelationships(data.relationships);
    await ensureRelatedContexts(data.launchId, relationships);

    const schedule = await OperationalSchedule.create({
      launchId: data.launchId,
      title: data.title.trim(),
      description: normalizeNullableString(data.description),
      area: data.area,
      priority: data.priority,
      status: data.status,
      type: data.type,
      responsible: data.responsible.trim(),
      startsAt,
      dueAt,
      timelinePosition: data.timelinePosition ?? 0,
      dependencyIds: [...(data.dependencyIds ?? [])],
      checklist: (data.checklist ?? []).map((item) => normalizeChecklistItem(item, authenticatedUserId)),
      attachments: (data.attachments ?? []).map((attachment) => normalizeAttachment(attachment)),
      comments: (data.comments ?? []).map((comment) => normalizeComment(comment)),
      tags: normalizeStringArray(data.tags),
      recurrence,
      reminder,
      relationships,
      attendance: {
        present: false,
        checkedBy: null,
        checkedAt: null
      },
      executionHistory: [
        buildExecutionHistoryEntry("CREATED", authenticatedUserId, "Atividade operacional criada.", {
          title: data.title.trim(),
          responsible: data.responsible.trim()
        }, null, data.status)
      ],
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OPERATIONAL_SCHEDULE_CREATED",
      targetType: "OPERATIONAL_SCHEDULE",
      targetId: schedule.id,
      context: {
        launchId: schedule.launchId,
        status: schedule.status,
        responsible: schedule.responsible,
        startsAt: schedule.startsAt,
        dueAt: schedule.dueAt,
        recurrence: schedule.recurrence,
        reminder: schedule.reminder,
        relationships: schedule.relationships
      }
    });

    return toPublicOperationalSchedule(schedule, dependencies);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.responsible) {
      query.responsible = filters.responsible.trim();
    }

    if (filters.area) {
      query.area = filters.area;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    } else {
      query.active = true;
    }

    if (filters.startAt || filters.endAt) {
      query.startsAt = {};

      if (filters.startAt) {
        query.startsAt.$gte = normalizeDate(filters.startAt);
      }

      if (filters.endAt) {
        query.startsAt.$lte = normalizeDate(filters.endAt);
      }
    }

    const schedules = await OperationalSchedule.find(query).sort({
      startsAt: 1,
      dueAt: 1,
      timelinePosition: 1,
      priority: -1
    });
    const allDependencyIds = [...new Set(schedules.flatMap((schedule) => schedule.dependencyIds ?? []))];
    const dependencyMap = allDependencyIds.length > 0 ? await buildScheduleMap(allDependencyIds) : new Map();
    const conflictIndex = buildConflictIndex(schedules);
    const now = new Date();
    const publicSchedules = schedules.map((schedule) =>
      toPublicOperationalSchedule(
        schedule,
        (schedule.dependencyIds ?? []).map((dependencyId) => dependencyMap.get(dependencyId)).filter(Boolean),
        conflictIndex,
        now
      )
    );
    const view = filters.view ?? "LIST";

    return {
      view,
      availableViews: [...operationalScheduleViews],
      filters: {
        launchId: filters.launchId ?? null,
        responsible: filters.responsible ?? null,
        area: filters.area ?? null,
        status: filters.status ?? null,
        type: filters.type ?? null,
        priority: filters.priority ?? null,
        startAt: filters.startAt ? normalizeDate(filters.startAt) : null,
        endAt: filters.endAt ? normalizeDate(filters.endAt) : null
      },
      summary: {
        total: publicSchedules.length,
        delayed: publicSchedules.filter((schedule) => schedule.indicators.delayed).length,
        conflicting: publicSchedules.filter((schedule) => schedule.indicators.hasConflict).length
      },
      projection: buildViewPayload(view, publicSchedules),
      items: publicSchedules
    };
  }

  async getById(activityId) {
    const schedule = await OperationalSchedule.findById(activityId);

    if (!schedule || !schedule.active) {
      throw {
        statusCode: 404,
        message: "Operational schedule activity not found"
      };
    }

    const dependencies = await resolveDependencies(schedule.launchId, schedule.dependencyIds ?? [], [schedule.id]);
    const sameResponsibleSchedules = await OperationalSchedule.find({
      launchId: schedule.launchId,
      responsible: schedule.responsible,
      active: true
    }).sort({ startsAt: 1, dueAt: 1 });
    const conflictIndex = buildConflictIndex(sameResponsibleSchedules);

    return toPublicOperationalSchedule(schedule, dependencies, conflictIndex);
  }

  async update(authenticatedUserId, activityId, data) {
    const schedule = await OperationalSchedule.findById(activityId);

    if (!schedule || !schedule.active) {
      throw {
        statusCode: 404,
        message: "Operational schedule activity not found"
      };
    }

    const startsAt = data.startsAt ? normalizeDate(data.startsAt) : schedule.startsAt;
    const dueAt = data.dueAt ? normalizeDate(data.dueAt) : schedule.dueAt;
    validateScheduleDates(startsAt, dueAt);

    const dependencyIds = data.dependencyIds ?? schedule.dependencyIds ?? [];
    const dependencies = await resolveDependencies(schedule.launchId, dependencyIds, [schedule.id]);
    enforceDependencyWindow(startsAt, dependencies);
    const recurrence = data.recurrence ? normalizeRecurrence(data.recurrence, schedule.recurrence ?? {}) : schedule.recurrence ?? normalizeRecurrence();
    const reminder = data.reminder ? normalizeReminder(data.reminder, schedule.reminder ?? {}) : schedule.reminder ?? normalizeReminder();
    const relationships = data.relationships
      ? normalizeRelationships(data.relationships, schedule.relationships ?? {})
      : schedule.relationships ?? normalizeRelationships();
    await ensureRelatedContexts(schedule.launchId, relationships);

    const updates = {
      title: data.title?.trim() ?? schedule.title,
      description: data.description !== undefined ? normalizeNullableString(data.description) : schedule.description,
      area: data.area ?? schedule.area,
      priority: data.priority ?? schedule.priority,
      status: data.status ?? schedule.status,
      type: data.type ?? schedule.type,
      responsible: data.responsible?.trim() ?? schedule.responsible,
      startsAt,
      dueAt,
      timelinePosition: data.timelinePosition ?? schedule.timelinePosition,
      dependencyIds: [...dependencyIds],
      checklist: data.checklist ? data.checklist.map((item) => normalizeChecklistItem(item, authenticatedUserId)) : schedule.checklist,
      attachments: data.attachments ? data.attachments.map((attachment) => normalizeAttachment(attachment)) : schedule.attachments,
      comments: data.comments ? data.comments.map((comment) => normalizeComment(comment)) : schedule.comments,
      tags: data.tags ? normalizeStringArray(data.tags) : schedule.tags,
      recurrence,
      reminder,
      relationships,
      attendance: schedule.attendance ?? normalizeAttendance(),
      executionHistory: [
        ...(schedule.executionHistory ?? []),
        buildExecutionHistoryEntry(
          "UPDATED",
          authenticatedUserId,
          "Atividade operacional atualizada.",
          {
            title: data.title?.trim() ?? schedule.title,
            checklistCompleted: (data.checklist ? data.checklist.filter((item) => item.completed).length : schedule.checklist.filter((item) => item.completed).length)
          },
          schedule.status,
          data.status ?? schedule.status
        )
      ],
      updatedBy: authenticatedUserId
    };

    await OperationalSchedule.updateOne(
      { _id: activityId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OPERATIONAL_SCHEDULE_UPDATED",
      targetType: "OPERATIONAL_SCHEDULE",
      targetId: schedule.id,
      context: {
        launchId: schedule.launchId,
        previousStatus: schedule.status,
        status: updates.status,
        previousResponsible: schedule.responsible,
        responsible: updates.responsible
      }
    });

    return toPublicOperationalSchedule(
      {
        ...schedule.toObject(),
        ...updates,
        id: schedule.id,
        updatedAt: new Date()
      },
      dependencies
    );
  }

  async replan(authenticatedUserId, data) {
    const activityIds = data.items.map((item) => item.activityId);
    const scheduleMap = await buildScheduleMap(activityIds);
    const bulkOperations = [];
    const confirmations = [];

    for (const item of data.items) {
      const schedule = scheduleMap.get(item.activityId);
      const startsAt = item.startsAt ? normalizeDate(item.startsAt) : schedule.startsAt;
      const dueAt = item.dueAt ? normalizeDate(item.dueAt) : schedule.dueAt;
      validateScheduleDates(startsAt, dueAt);

      const dependencyIds = item.dependencyIds ?? schedule.dependencyIds ?? [];
      const dependencies = await resolveDependencies(schedule.launchId, dependencyIds, [schedule.id, ...activityIds]);
      enforceDependencyWindow(startsAt, dependencies);

      const nextStatus = item.status ?? schedule.status;
      const nextTimelinePosition = item.timelinePosition ?? schedule.timelinePosition;

      bulkOperations.push({
        updateOne: {
          filter: { _id: schedule.id },
          update: {
            $set: {
              startsAt,
              dueAt,
              status: nextStatus,
              timelinePosition: nextTimelinePosition,
              dependencyIds,
              updatedBy: authenticatedUserId
            }
          }
        }
      });

      confirmations.push({
        activityId: schedule.id,
        title: schedule.title,
        from: {
          startsAt: schedule.startsAt,
          dueAt: schedule.dueAt,
          status: schedule.status,
          timelinePosition: schedule.timelinePosition
        },
        to: {
          startsAt,
          dueAt,
          status: nextStatus,
          timelinePosition: nextTimelinePosition
        }
      });
    }

    if (bulkOperations.length > 0) {
      await OperationalSchedule.bulkWrite(bulkOperations);
    }

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OPERATIONAL_SCHEDULE_REPLANNED",
      targetType: "OPERATIONAL_SCHEDULE",
      targetId: activityIds.join(","),
      context: {
        activities: confirmations.length,
        view: data.view ?? "LIST"
      }
    });

    const launchId = scheduleMap.get(activityIds[0]).launchId;
    const refreshed = await this.list({
      launchId,
      responsible: data.filters?.responsible,
      area: data.filters?.area,
      status: data.filters?.status,
      type: data.filters?.type,
      priority: data.filters?.priority,
      startAt: data.filters?.startAt,
      endAt: data.filters?.endAt,
      view: data.view ?? "LIST"
    });

    return {
      message: "Operational schedule replanned successfully",
      updatedCount: confirmations.length,
      confirmations,
      ...refreshed
    };
  }

  async recordExecution(authenticatedUserId, activityId, data) {
    const schedule = await OperationalSchedule.findById(activityId);

    if (!schedule || !schedule.active) {
      throw {
        statusCode: 404,
        message: "Operational schedule activity not found"
      };
    }

    const checklist = data.checklist ? data.checklist.map((item) => normalizeChecklistItem(item, authenticatedUserId)) : schedule.checklist;
    const attendance = data.attendance
      ? normalizeAttendance(
          {
            ...data.attendance,
            checkedBy: authenticatedUserId
          },
          schedule.attendance ?? {}
        )
      : schedule.attendance ?? normalizeAttendance();
    const nextStatus = data.status ?? schedule.status;
    const executionHistory = [
      ...(schedule.executionHistory ?? []),
      buildExecutionHistoryEntry(
        data.complete ? "COMPLETED" : attendance.present ? "ATTENDANCE_MARKED" : "EXECUTION_RECORDED",
        authenticatedUserId,
        data.complete ? "Atividade operacional concluida." : "Execucao operacional atualizada.",
        {
          attendanceMarked: attendance.present,
          checklistCompleted: checklist.filter((item) => item.completed).length,
          checklistTotal: checklist.length
        },
        schedule.status,
        nextStatus
      )
    ];

    const updates = {
      checklist,
      attendance,
      status: nextStatus,
      executionHistory,
      updatedBy: authenticatedUserId
    };

    await OperationalSchedule.updateOne(
      { _id: activityId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OPERATIONAL_SCHEDULE_EXECUTION_RECORDED",
      targetType: "OPERATIONAL_SCHEDULE",
      targetId: schedule.id,
      context: {
        launchId: schedule.launchId,
        previousStatus: schedule.status,
        status: nextStatus,
        attendanceMarked: attendance.present,
        checklistCompleted: checklist.filter((item) => item.completed).length,
        checklistTotal: checklist.length
      }
    });

    const dependencies = await resolveDependencies(schedule.launchId, schedule.dependencyIds ?? [], [schedule.id]);

    return toPublicOperationalSchedule(
      {
        ...schedule.toObject(),
        ...updates,
        id: schedule.id,
        updatedAt: new Date()
      },
      dependencies
    );
  }
}

export const operationalScheduleService = new OperationalScheduleService();

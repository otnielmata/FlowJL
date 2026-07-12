import { ClassSchedule } from "../models/class-schedule.model.js";
import { Launch } from "../models/launch.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeString(value) {
  return value?.trim() ?? null;
}

function toPublicClassSchedule(classSchedule) {
  return {
    id: classSchedule.id,
    launchId: classSchedule.launchId,
    title: classSchedule.title,
    scheduledAt: classSchedule.scheduledAt,
    responsible: classSchedule.responsible,
    status: classSchedule.status,
    notes: classSchedule.notes ?? null,
    active: classSchedule.active,
    deactivatedAt: classSchedule.deactivatedAt ?? null,
    createdAt: classSchedule.createdAt,
    updatedAt: classSchedule.updatedAt,
    createdBy: classSchedule.createdBy ?? null,
    updatedBy: classSchedule.updatedBy ?? null
  };
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

class ClassScheduleService {
  async create(authenticatedUserId, data) {
    await ensureLaunchExists(data.launchId);

    const classSchedule = await ClassSchedule.create({
      launchId: data.launchId,
      title: data.title.trim(),
      scheduledAt: normalizeDate(data.scheduledAt),
      responsible: data.responsible.trim(),
      status: data.status,
      notes: normalizeString(data.notes),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CLASS_SCHEDULE_CREATED",
      targetType: "CLASS_SCHEDULE",
      targetId: classSchedule.id,
      context: {
        launchId: classSchedule.launchId,
        scheduledAt: classSchedule.scheduledAt,
        responsible: classSchedule.responsible,
        status: classSchedule.status
      }
    });

    return toPublicClassSchedule(classSchedule);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.responsible) {
      query.responsible = filters.responsible.trim();
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    } else {
      query.active = true;
    }

    if (filters.startAt || filters.endAt) {
      query.scheduledAt = {};

      if (filters.startAt) {
        query.scheduledAt.$gte = normalizeDate(filters.startAt);
      }

      if (filters.endAt) {
        query.scheduledAt.$lte = normalizeDate(filters.endAt);
      }
    }

    const classSchedules = await ClassSchedule.find(query).sort({ scheduledAt: 1, title: 1 });
    return classSchedules.map((classSchedule) => toPublicClassSchedule(classSchedule));
  }

  async update(authenticatedUserId, classScheduleId, data) {
    const classSchedule = await ClassSchedule.findById(classScheduleId);

    if (!classSchedule || !classSchedule.active) {
      throw {
        statusCode: 404,
        message: "Class schedule not found"
      };
    }

    const updates = {
      title: data.title?.trim() ?? classSchedule.title,
      scheduledAt: data.scheduledAt ? normalizeDate(data.scheduledAt) : classSchedule.scheduledAt,
      responsible: data.responsible?.trim() ?? classSchedule.responsible,
      status: data.status ?? classSchedule.status,
      notes: data.notes !== undefined ? normalizeString(data.notes) : classSchedule.notes,
      updatedBy: authenticatedUserId
    };

    await ClassSchedule.updateOne(
      { _id: classScheduleId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CLASS_SCHEDULE_UPDATED",
      targetType: "CLASS_SCHEDULE",
      targetId: classSchedule.id,
      context: {
        launchId: classSchedule.launchId,
        previousScheduledAt: classSchedule.scheduledAt,
        scheduledAt: updates.scheduledAt,
        previousResponsible: classSchedule.responsible,
        responsible: updates.responsible,
        previousStatus: classSchedule.status,
        status: updates.status
      }
    });

    return toPublicClassSchedule({
      ...classSchedule.toObject(),
      ...updates,
      id: classSchedule.id,
      updatedAt: new Date()
    });
  }

  async deactivate(authenticatedUserId, classScheduleId) {
    const classSchedule = await ClassSchedule.findById(classScheduleId);

    if (!classSchedule) {
      throw {
        statusCode: 404,
        message: "Class schedule not found"
      };
    }

    if (!classSchedule.active) {
      throw {
        statusCode: 409,
        message: "Class schedule is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await ClassSchedule.updateOne(
      { _id: classScheduleId },
      {
        $set: {
          active: false,
          deactivatedAt,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CLASS_SCHEDULE_DEACTIVATED",
      targetType: "CLASS_SCHEDULE",
      targetId: classSchedule.id,
      context: {
        launchId: classSchedule.launchId,
        scheduledAt: classSchedule.scheduledAt,
        responsible: classSchedule.responsible,
        status: classSchedule.status
      }
    });

    return toPublicClassSchedule({
      ...classSchedule.toObject(),
      id: classSchedule.id,
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    });
  }
}

export const classScheduleService = new ClassScheduleService();
export { toPublicClassSchedule };

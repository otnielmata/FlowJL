import { Launch } from "../models/launch.model.js";
import { LiveEvent } from "../models/live-event.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeString(value) {
  return value?.trim() ?? null;
}

function toPublicLiveEvent(liveEvent) {
  return {
    id: liveEvent.id,
    launchId: liveEvent.launchId,
    name: liveEvent.name,
    scheduledAt: liveEvent.scheduledAt,
    channel: liveEvent.channel,
    responsible: liveEvent.responsible,
    status: liveEvent.status,
    accessUrl: liveEvent.accessUrl ?? null,
    notes: liveEvent.notes ?? null,
    active: liveEvent.active,
    deactivatedAt: liveEvent.deactivatedAt ?? null,
    createdAt: liveEvent.createdAt,
    updatedAt: liveEvent.updatedAt,
    createdBy: liveEvent.createdBy ?? null,
    updatedBy: liveEvent.updatedBy ?? null
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

class LiveEventService {
  async create(authenticatedUserId, data) {
    await ensureLaunchExists(data.launchId);

    const liveEvent = await LiveEvent.create({
      launchId: data.launchId,
      name: data.name.trim(),
      scheduledAt: normalizeDate(data.scheduledAt),
      channel: data.channel.trim(),
      responsible: data.responsible.trim(),
      status: data.status,
      accessUrl: normalizeString(data.accessUrl),
      notes: normalizeString(data.notes),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "LIVE_EVENT_CREATED",
      targetType: "LIVE_EVENT",
      targetId: liveEvent.id,
      context: {
        launchId: liveEvent.launchId,
        scheduledAt: liveEvent.scheduledAt,
        channel: liveEvent.channel,
        responsible: liveEvent.responsible,
        status: liveEvent.status
      }
    });

    return toPublicLiveEvent(liveEvent);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.channel) {
      query.channel = filters.channel.trim();
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

    const liveEvents = await LiveEvent.find(query).sort({ scheduledAt: 1, name: 1 });
    return liveEvents.map((liveEvent) => toPublicLiveEvent(liveEvent));
  }

  async update(authenticatedUserId, liveEventId, data) {
    const liveEvent = await LiveEvent.findById(liveEventId);

    if (!liveEvent || !liveEvent.active) {
      throw {
        statusCode: 404,
        message: "Live event not found"
      };
    }

    const updates = {
      name: data.name?.trim() ?? liveEvent.name,
      scheduledAt: data.scheduledAt ? normalizeDate(data.scheduledAt) : liveEvent.scheduledAt,
      channel: data.channel?.trim() ?? liveEvent.channel,
      responsible: data.responsible?.trim() ?? liveEvent.responsible,
      status: data.status ?? liveEvent.status,
      accessUrl: data.accessUrl !== undefined ? normalizeString(data.accessUrl) : liveEvent.accessUrl,
      notes: data.notes !== undefined ? normalizeString(data.notes) : liveEvent.notes,
      updatedBy: authenticatedUserId
    };

    await LiveEvent.updateOne(
      { _id: liveEventId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "LIVE_EVENT_UPDATED",
      targetType: "LIVE_EVENT",
      targetId: liveEvent.id,
      context: {
        launchId: liveEvent.launchId,
        previousScheduledAt: liveEvent.scheduledAt,
        scheduledAt: updates.scheduledAt,
        previousChannel: liveEvent.channel,
        channel: updates.channel,
        previousResponsible: liveEvent.responsible,
        responsible: updates.responsible,
        previousStatus: liveEvent.status,
        status: updates.status
      }
    });

    return toPublicLiveEvent({
      ...liveEvent.toObject(),
      ...updates,
      id: liveEvent.id,
      updatedAt: new Date()
    });
  }

  async deactivate(authenticatedUserId, liveEventId) {
    const liveEvent = await LiveEvent.findById(liveEventId);

    if (!liveEvent) {
      throw {
        statusCode: 404,
        message: "Live event not found"
      };
    }

    if (!liveEvent.active) {
      throw {
        statusCode: 409,
        message: "Live event is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await LiveEvent.updateOne(
      { _id: liveEventId },
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
      action: "LIVE_EVENT_DEACTIVATED",
      targetType: "LIVE_EVENT",
      targetId: liveEvent.id,
      context: {
        launchId: liveEvent.launchId,
        scheduledAt: liveEvent.scheduledAt,
        channel: liveEvent.channel,
        responsible: liveEvent.responsible,
        status: liveEvent.status
      }
    });

    return toPublicLiveEvent({
      ...liveEvent.toObject(),
      id: liveEvent.id,
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    });
  }
}

export const liveEventService = new LiveEventService();
export { toPublicLiveEvent };

import { randomUUID } from "node:crypto";

import { Launch } from "../models/launch.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
import { TrafficConversionEvent } from "../models/traffic-conversion-event.model.js";
import { TrafficPixel } from "../models/traffic-pixel.model.js";
import { auditService } from "./audit.service.js";

function normalizeUpper(value) {
  return value.trim().toUpperCase();
}

function normalizeOptionalString(value) {
  return value ? value.trim() : null;
}

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toPublicHistoryEntry(entry) {
  return {
    id: entry.id,
    action: entry.action,
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus ?? null,
    campaignIdsSnapshot: [...(entry.campaignIdsSnapshot ?? [])],
    pixelIdsSnapshot: [...(entry.pixelIdsSnapshot ?? [])],
    eventAtSnapshot: entry.eventAtSnapshot ?? null,
    reason: entry.reason ?? null,
    actedBy: entry.actedBy,
    actedAt: entry.actedAt
  };
}

function toPublicTrafficConversionEvent(event) {
  return {
    id: event.id,
    launchId: event.launchId,
    campaignIds: [...event.campaignIds],
    pixelIds: [...event.pixelIds],
    name: event.name,
    objective: event.objective,
    origin: event.origin,
    status: event.status,
    eventAt: event.eventAt ?? null,
    active: event.active,
    deactivatedAt: event.deactivatedAt ?? null,
    history: event.history.map((entry) => toPublicHistoryEntry(entry)),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    createdBy: event.createdBy ?? null,
    updatedBy: event.updatedBy ?? null
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

  return launch;
}

async function resolveCampaignsOrThrow(campaignIds = []) {
  const campaigns = [];

  for (const campaignId of campaignIds) {
    const campaign = await TrafficCampaign.findById(campaignId);

    if (!campaign || !campaign.active) {
      throw {
        statusCode: 404,
        message: "Traffic campaign not found"
      };
    }

    campaigns.push(campaign);
  }

  return campaigns;
}

async function resolvePixelsOrThrow(pixelIds = []) {
  const pixels = [];

  for (const pixelId of pixelIds) {
    const pixel = await TrafficPixel.findById(pixelId);

    if (!pixel || !pixel.active) {
      throw {
        statusCode: 404,
        message: "Traffic pixel not found"
      };
    }

    pixels.push(pixel);
  }

  return pixels;
}

function resolveLaunchId(data, campaigns) {
  const campaignLaunchIds = [...new Set(campaigns.map((campaign) => campaign.launchId))];

  if (data.launchId && campaignLaunchIds.some((launchId) => launchId !== data.launchId)) {
    throw {
      statusCode: 409,
      message: "Conversion event campaigns must belong to the informed launch"
    };
  }

  return data.launchId ?? campaignLaunchIds[0] ?? null;
}

function ensurePixelsBelongToLaunch(pixels, launchId) {
  if (pixels.some((pixel) => pixel.launchId !== launchId)) {
    throw {
      statusCode: 409,
      message: "Conversion event pixels must belong to the event launch"
    };
  }
}

function createHistoryEntry({ action, event = {}, updates = {}, actedBy, reason = null }) {
  return {
    id: randomUUID(),
    action,
    fromStatus: event.status ?? null,
    toStatus: updates.status ?? event.status ?? null,
    campaignIdsSnapshot: [...(updates.campaignIds ?? event.campaignIds ?? [])],
    pixelIdsSnapshot: [...(updates.pixelIds ?? event.pixelIds ?? [])],
    eventAtSnapshot: updates.eventAt ?? event.eventAt ?? null,
    reason,
    actedBy,
    actedAt: new Date()
  };
}

class TrafficConversionEventService {
  async create(authenticatedUserId, data) {
    const campaignIds = uniqueStrings(data.campaignIds);
    const campaigns = await resolveCampaignsOrThrow(campaignIds);
    const launchId = resolveLaunchId(data, campaigns);

    if (!launchId) {
      throw {
        statusCode: 400,
        message: "Traffic conversion event requires a launch or campaign context"
      };
    }

    await ensureLaunchExists(launchId);

    const pixelIds = uniqueStrings(data.pixelIds);
    const pixels = await resolvePixelsOrThrow(pixelIds);
    ensurePixelsBelongToLaunch(pixels, launchId);

    const eventPayload = {
      launchId,
      campaignIds,
      pixelIds,
      name: data.name.trim(),
      objective: data.objective.trim(),
      origin: normalizeUpper(data.origin),
      status: data.status ? normalizeUpper(data.status) : "DRAFT",
      eventAt: normalizeDate(data.eventAt),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "CREATED",
      updates: eventPayload,
      actedBy: authenticatedUserId
    });

    const event = await TrafficConversionEvent.create({
      ...eventPayload,
      history: [historyEntry]
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_CONVERSION_EVENT_CREATED",
      targetType: "TRAFFIC_CONVERSION_EVENT",
      targetId: event.id,
      context: {
        launchId: event.launchId,
        campaignIds: event.campaignIds,
        pixelIds: event.pixelIds,
        origin: event.origin,
        status: event.status,
        eventAt: event.eventAt
      }
    });

    return toPublicTrafficConversionEvent(event);
  }

  async list(filters = {}) {
    const query = {
      active: true
    };

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.campaignId) {
      query.campaignIds = filters.campaignId;
    }

    if (filters.pixelId) {
      query.pixelIds = filters.pixelId;
    }

    if (filters.origin) {
      query.origin = normalizeUpper(filters.origin);
    }

    if (filters.status) {
      query.status = normalizeUpper(filters.status);
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const events = await TrafficConversionEvent.find(query).sort({ eventAt: -1, createdAt: -1, name: 1 });

    return events.map((event) => toPublicTrafficConversionEvent(event));
  }

  async update(authenticatedUserId, eventId, data) {
    const event = await TrafficConversionEvent.findById(eventId);

    if (!event || !event.active) {
      throw {
        statusCode: 404,
        message: "Traffic conversion event not found"
      };
    }

    const updates = {
      objective: data.objective?.trim() ?? event.objective,
      origin: data.origin ? normalizeUpper(data.origin) : event.origin,
      status: data.status ? normalizeUpper(data.status) : event.status,
      eventAt: data.eventAt !== undefined ? normalizeDate(data.eventAt) : event.eventAt ?? null,
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "UPDATED",
      event,
      updates,
      actedBy: authenticatedUserId,
      reason: normalizeOptionalString(data.reason)
    });
    const nextHistory = [...event.history, historyEntry];

    await TrafficConversionEvent.updateOne(
      { _id: eventId },
      {
        $set: {
          ...updates,
          history: nextHistory
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_CONVERSION_EVENT_UPDATED",
      targetType: "TRAFFIC_CONVERSION_EVENT",
      targetId: event.id,
      context: {
        launchId: event.launchId,
        previousStatus: event.status,
        status: updates.status,
        origin: updates.origin,
        eventAt: updates.eventAt
      }
    });

    return toPublicTrafficConversionEvent({
      ...event.toObject(),
      ...updates,
      history: nextHistory
    });
  }

  async updateLinks(authenticatedUserId, eventId, data) {
    const event = await TrafficConversionEvent.findById(eventId);

    if (!event || !event.active) {
      throw {
        statusCode: 404,
        message: "Traffic conversion event not found"
      };
    }

    const campaignIds = data.campaignIds !== undefined ? uniqueStrings(data.campaignIds) : [...event.campaignIds];
    const campaigns = await resolveCampaignsOrThrow(campaignIds);

    if (campaigns.some((campaign) => campaign.launchId !== event.launchId)) {
      throw {
        statusCode: 409,
        message: "Conversion event campaigns must belong to the event launch"
      };
    }

    const pixelIds = data.pixelIds !== undefined ? uniqueStrings(data.pixelIds) : [...event.pixelIds];
    const pixels = await resolvePixelsOrThrow(pixelIds);
    ensurePixelsBelongToLaunch(pixels, event.launchId);

    const updates = {
      campaignIds,
      pixelIds,
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "LINKS_UPDATED",
      event,
      updates,
      actedBy: authenticatedUserId,
      reason: normalizeOptionalString(data.reason)
    });
    const nextHistory = [...event.history, historyEntry];

    await TrafficConversionEvent.updateOne(
      { _id: eventId },
      {
        $set: {
          ...updates,
          history: nextHistory
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_CONVERSION_EVENT_LINKS_UPDATED",
      targetType: "TRAFFIC_CONVERSION_EVENT",
      targetId: event.id,
      context: {
        launchId: event.launchId,
        campaignIds: updates.campaignIds,
        pixelIds: updates.pixelIds
      }
    });

    return toPublicTrafficConversionEvent({
      ...event.toObject(),
      ...updates,
      history: nextHistory
    });
  }

  async deactivate(authenticatedUserId, eventId) {
    const event = await TrafficConversionEvent.findById(eventId);

    if (!event) {
      throw {
        statusCode: 404,
        message: "Traffic conversion event not found"
      };
    }

    if (!event.active) {
      throw {
        statusCode: 409,
        message: "Traffic conversion event is already inactive"
      };
    }

    const deactivatedAt = new Date();
    const historyEntry = createHistoryEntry({
      action: "DEACTIVATED",
      event,
      updates: {
        status: "ARCHIVED",
        campaignIds: event.campaignIds,
        pixelIds: event.pixelIds,
        eventAt: event.eventAt ?? null
      },
      actedBy: authenticatedUserId
    });
    const nextHistory = [...event.history, historyEntry];

    await TrafficConversionEvent.updateOne(
      { _id: eventId },
      {
        $set: {
          status: "ARCHIVED",
          active: false,
          deactivatedAt,
          history: nextHistory,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_CONVERSION_EVENT_DEACTIVATED",
      targetType: "TRAFFIC_CONVERSION_EVENT",
      targetId: event.id,
      context: {
        launchId: event.launchId,
        previousStatus: event.status,
        status: "ARCHIVED"
      }
    });

    return toPublicTrafficConversionEvent({
      ...event.toObject(),
      status: "ARCHIVED",
      active: false,
      deactivatedAt,
      history: nextHistory,
      updatedBy: authenticatedUserId
    });
  }
}

export const trafficConversionEventService = new TrafficConversionEventService();

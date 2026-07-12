import { createHash, randomUUID } from "node:crypto";

import { Launch } from "../models/launch.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
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

function hashSecret(value) {
  return value ? createHash("sha256").update(value).digest("hex") : null;
}

function normalizeSecrets(secrets = {}, currentSecrets = {}) {
  return {
    accessTokenHash: secrets.accessToken !== undefined ? hashSecret(secrets.accessToken) : currentSecrets.accessTokenHash ?? null,
    secretHash: secrets.secret !== undefined ? hashSecret(secrets.secret) : currentSecrets.secretHash ?? null,
    tokenExpiresAt: secrets.tokenExpiresAt !== undefined ? normalizeDate(secrets.tokenExpiresAt) : currentSecrets.tokenExpiresAt ?? null
  };
}

function toPublicHistoryEntry(entry) {
  return {
    id: entry.id,
    action: entry.action,
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus ?? null,
    campaignIdsSnapshot: [...(entry.campaignIdsSnapshot ?? [])],
    conversionEventIdsSnapshot: [...(entry.conversionEventIdsSnapshot ?? [])],
    reason: entry.reason ?? null,
    actedBy: entry.actedBy,
    actedAt: entry.actedAt
  };
}

function toPublicTrafficPixel(pixel) {
  const secrets = pixel.secrets ?? {};

  return {
    id: pixel.id,
    launchId: pixel.launchId,
    platform: pixel.platform,
    externalPixelId: pixel.externalPixelId,
    purpose: pixel.purpose,
    status: pixel.status,
    campaignIds: [...pixel.campaignIds],
    conversionEventIds: [...pixel.conversionEventIds],
    secretState: {
      accessTokenConfigured: Boolean(secrets.accessTokenHash),
      secretConfigured: Boolean(secrets.secretHash),
      tokenExpiresAt: secrets.tokenExpiresAt ?? null
    },
    active: pixel.active,
    deactivatedAt: pixel.deactivatedAt ?? null,
    history: pixel.history.map((entry) => toPublicHistoryEntry(entry)),
    createdAt: pixel.createdAt,
    updatedAt: pixel.updatedAt,
    createdBy: pixel.createdBy ?? null,
    updatedBy: pixel.updatedBy ?? null
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

function resolveLaunchId(data, campaigns) {
  const campaignLaunchIds = [...new Set(campaigns.map((campaign) => campaign.launchId))];

  if (data.launchId && campaignLaunchIds.some((launchId) => launchId !== data.launchId)) {
    throw {
      statusCode: 409,
      message: "Pixel campaigns must belong to the informed launch"
    };
  }

  return data.launchId ?? campaignLaunchIds[0] ?? null;
}

function createHistoryEntry({ action, pixel = {}, updates = {}, actedBy, reason = null }) {
  return {
    id: randomUUID(),
    action,
    fromStatus: pixel.status ?? null,
    toStatus: updates.status ?? pixel.status ?? null,
    campaignIdsSnapshot: [...(updates.campaignIds ?? pixel.campaignIds ?? [])],
    conversionEventIdsSnapshot: [...(updates.conversionEventIds ?? pixel.conversionEventIds ?? [])],
    reason,
    actedBy,
    actedAt: new Date()
  };
}

class TrafficPixelService {
  async create(authenticatedUserId, data) {
    const campaignIds = uniqueStrings(data.campaignIds);
    const campaigns = await resolveCampaignsOrThrow(campaignIds);
    const launchId = resolveLaunchId(data, campaigns);

    if (!launchId) {
      throw {
        statusCode: 400,
        message: "Traffic pixel requires a launch or campaign context"
      };
    }

    await ensureLaunchExists(launchId);

    const pixelPayload = {
      launchId,
      platform: normalizeUpper(data.platform),
      externalPixelId: data.externalPixelId.trim(),
      purpose: data.purpose.trim(),
      status: data.status ? normalizeUpper(data.status) : "DRAFT",
      campaignIds,
      conversionEventIds: uniqueStrings(data.conversionEventIds),
      secrets: normalizeSecrets(data.secrets),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "CREATED",
      updates: pixelPayload,
      actedBy: authenticatedUserId
    });

    const pixel = await TrafficPixel.create({
      ...pixelPayload,
      history: [historyEntry]
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_PIXEL_CREATED",
      targetType: "TRAFFIC_PIXEL",
      targetId: pixel.id,
      context: {
        launchId: pixel.launchId,
        platform: pixel.platform,
        externalPixelId: pixel.externalPixelId,
        campaignIds: pixel.campaignIds,
        conversionEventIds: pixel.conversionEventIds,
        status: pixel.status
      }
    });

    return toPublicTrafficPixel(pixel);
  }

  async list(filters = {}) {
    const query = {
      active: true
    };

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.platform) {
      query.platform = normalizeUpper(filters.platform);
    }

    if (filters.status) {
      query.status = normalizeUpper(filters.status);
    }

    if (filters.campaignId) {
      query.campaignIds = filters.campaignId;
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const pixels = await TrafficPixel.find(query).sort({ createdAt: -1, platform: 1 });

    return pixels.map((pixel) => toPublicTrafficPixel(pixel));
  }

  async update(authenticatedUserId, pixelId, data) {
    const pixel = await TrafficPixel.findById(pixelId);

    if (!pixel || !pixel.active) {
      throw {
        statusCode: 404,
        message: "Traffic pixel not found"
      };
    }

    const updates = {
      purpose: data.purpose?.trim() ?? pixel.purpose,
      status: data.status ? normalizeUpper(data.status) : pixel.status,
      secrets: data.secrets ? normalizeSecrets(data.secrets, pixel.secrets ?? {}) : pixel.secrets,
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "UPDATED",
      pixel,
      updates,
      actedBy: authenticatedUserId,
      reason: normalizeOptionalString(data.reason)
    });
    const nextHistory = [...pixel.history, historyEntry];

    await TrafficPixel.updateOne(
      { _id: pixelId },
      {
        $set: {
          ...updates,
          history: nextHistory
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_PIXEL_UPDATED",
      targetType: "TRAFFIC_PIXEL",
      targetId: pixel.id,
      context: {
        launchId: pixel.launchId,
        platform: pixel.platform,
        previousStatus: pixel.status,
        status: updates.status
      }
    });

    return toPublicTrafficPixel({
      ...pixel.toObject(),
      ...updates,
      history: nextHistory
    });
  }

  async updateLinks(authenticatedUserId, pixelId, data) {
    const pixel = await TrafficPixel.findById(pixelId);

    if (!pixel || !pixel.active) {
      throw {
        statusCode: 404,
        message: "Traffic pixel not found"
      };
    }

    const campaignIds = data.campaignIds !== undefined ? uniqueStrings(data.campaignIds) : [...pixel.campaignIds];
    const campaigns = await resolveCampaignsOrThrow(campaignIds);

    if (campaigns.some((campaign) => campaign.launchId !== pixel.launchId)) {
      throw {
        statusCode: 409,
        message: "Pixel campaigns must belong to the pixel launch"
      };
    }

    const updates = {
      campaignIds,
      conversionEventIds:
        data.conversionEventIds !== undefined ? uniqueStrings(data.conversionEventIds) : [...pixel.conversionEventIds],
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "LINKS_UPDATED",
      pixel,
      updates,
      actedBy: authenticatedUserId,
      reason: normalizeOptionalString(data.reason)
    });
    const nextHistory = [...pixel.history, historyEntry];

    await TrafficPixel.updateOne(
      { _id: pixelId },
      {
        $set: {
          ...updates,
          history: nextHistory
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_PIXEL_LINKS_UPDATED",
      targetType: "TRAFFIC_PIXEL",
      targetId: pixel.id,
      context: {
        launchId: pixel.launchId,
        platform: pixel.platform,
        campaignIds: updates.campaignIds,
        conversionEventIds: updates.conversionEventIds
      }
    });

    return toPublicTrafficPixel({
      ...pixel.toObject(),
      ...updates,
      history: nextHistory
    });
  }

  async deactivate(authenticatedUserId, pixelId) {
    const pixel = await TrafficPixel.findById(pixelId);

    if (!pixel) {
      throw {
        statusCode: 404,
        message: "Traffic pixel not found"
      };
    }

    if (!pixel.active) {
      throw {
        statusCode: 409,
        message: "Traffic pixel is already inactive"
      };
    }

    const deactivatedAt = new Date();
    const historyEntry = createHistoryEntry({
      action: "DEACTIVATED",
      pixel,
      updates: {
        status: "ARCHIVED",
        campaignIds: pixel.campaignIds,
        conversionEventIds: pixel.conversionEventIds
      },
      actedBy: authenticatedUserId
    });
    const nextHistory = [...pixel.history, historyEntry];

    await TrafficPixel.updateOne(
      { _id: pixelId },
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
      action: "TRAFFIC_PIXEL_DEACTIVATED",
      targetType: "TRAFFIC_PIXEL",
      targetId: pixel.id,
      context: {
        launchId: pixel.launchId,
        platform: pixel.platform,
        previousStatus: pixel.status,
        status: "ARCHIVED"
      }
    });

    return toPublicTrafficPixel({
      ...pixel.toObject(),
      status: "ARCHIVED",
      active: false,
      deactivatedAt,
      history: nextHistory,
      updatedBy: authenticatedUserId
    });
  }
}

export const trafficPixelService = new TrafficPixelService();

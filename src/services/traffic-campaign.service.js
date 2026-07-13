import { randomUUID } from "node:crypto";

import { Launch } from "../models/launch.model.js";
import { TrafficAudience } from "../models/traffic-audience.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
import { TrafficConversionEvent } from "../models/traffic-conversion-event.model.js";
import { TrafficCreative } from "../models/traffic-creative.model.js";
import { TrafficPixel } from "../models/traffic-pixel.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return new Date(value);
}

function normalizeOptionalString(value) {
  return value ? value.trim() : null;
}

function normalizeUpper(value) {
  return value.trim().toUpperCase();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function ensureValidPeriod(periodStart, periodEnd) {
  if (periodStart.getTime() > periodEnd.getTime()) {
    throw {
      statusCode: 400,
      message: "periodStart must be before or equal to periodEnd"
    };
  }
}

function toPublicHistoryEntry(entry) {
  return {
    id: entry.id,
    action: entry.action,
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus ?? null,
    fromPeriodStart: entry.fromPeriodStart ?? null,
    toPeriodStart: entry.toPeriodStart ?? null,
    fromPeriodEnd: entry.fromPeriodEnd ?? null,
    toPeriodEnd: entry.toPeriodEnd ?? null,
    reason: entry.reason ?? null,
    actedBy: entry.actedBy,
    actedAt: entry.actedAt
  };
}

function toPublicTrafficCampaign(campaign) {
  return {
    id: campaign.id,
    launchId: campaign.launchId,
    name: campaign.name,
    objective: campaign.objective,
    channel: campaign.channel,
    periodStart: campaign.periodStart,
    periodEnd: campaign.periodEnd,
    status: campaign.status,
    budget: campaign.budget ?? null,
    externalCampaignId: campaign.externalCampaignId ?? null,
    relationships: {
      creativeIds: [...(campaign.creativeIds ?? [])],
      audienceIds: [...(campaign.audienceIds ?? [])],
      pixelIds: [...(campaign.pixelIds ?? [])],
      conversionEventIds: [...(campaign.conversionEventIds ?? [])]
    },
    history: campaign.history.map((entry) => toPublicHistoryEntry(entry)),
    active: campaign.active,
    deactivatedAt: campaign.deactivatedAt ?? null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    createdBy: campaign.createdBy ?? null,
    updatedBy: campaign.updatedBy ?? null
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

async function resolveCreativesOrThrow(creativeIds = [], launchId) {
  const creatives = [];

  for (const creativeId of creativeIds) {
    const creative = await TrafficCreative.findById(creativeId);

    if (!creative || !creative.active) {
      throw {
        statusCode: 404,
        message: "Traffic creative not found"
      };
    }

    if (creative.launchId !== launchId) {
      throw {
        statusCode: 409,
        message: "Traffic creative must belong to the campaign launch"
      };
    }

    creatives.push(creative);
  }

  return creatives;
}

async function resolveAudiencesOrThrow(audienceIds = [], launchId) {
  const audiences = [];

  for (const audienceId of audienceIds) {
    const audience = await TrafficAudience.findById(audienceId);

    if (!audience || !audience.active) {
      throw {
        statusCode: 404,
        message: "Traffic audience not found"
      };
    }

    if (audience.launchId !== launchId) {
      throw {
        statusCode: 409,
        message: "Traffic audience must belong to the campaign launch"
      };
    }

    audiences.push(audience);
  }

  return audiences;
}

async function resolvePixelsOrThrow(pixelIds = [], launchId) {
  const pixels = [];

  for (const pixelId of pixelIds) {
    const pixel = await TrafficPixel.findById(pixelId);

    if (!pixel || !pixel.active) {
      throw {
        statusCode: 404,
        message: "Traffic pixel not found"
      };
    }

    if (pixel.launchId !== launchId) {
      throw {
        statusCode: 409,
        message: "Traffic pixel must belong to the campaign launch"
      };
    }

    pixels.push(pixel);
  }

  return pixels;
}

async function resolveConversionEventsOrThrow(conversionEventIds = [], launchId) {
  const conversionEvents = [];

  for (const conversionEventId of conversionEventIds) {
    const conversionEvent = await TrafficConversionEvent.findById(conversionEventId);

    if (!conversionEvent || !conversionEvent.active) {
      throw {
        statusCode: 404,
        message: "Traffic conversion event not found"
      };
    }

    if (conversionEvent.launchId !== launchId) {
      throw {
        statusCode: 409,
        message: "Traffic conversion event must belong to the campaign launch"
      };
    }

    conversionEvents.push(conversionEvent);
  }

  return conversionEvents;
}

async function syncCreativeRelationships(previousIds, nextIds, campaignId, authenticatedUserId) {
  const previousSet = new Set(previousIds);
  const nextSet = new Set(nextIds);

  for (const creativeId of previousIds) {
    if (!nextSet.has(creativeId)) {
      await TrafficCreative.updateOne(
        { _id: creativeId, campaignId },
        {
          $set: {
            campaignId: null,
            updatedBy: authenticatedUserId
          }
        }
      );
    }
  }

  for (const creativeId of nextIds) {
    if (!previousSet.has(creativeId)) {
      await TrafficCreative.updateOne(
        { _id: creativeId },
        {
          $set: {
            campaignId,
            updatedBy: authenticatedUserId
          }
        }
      );
    }
  }
}

async function syncArrayRelationships(model, previousIds, nextIds, campaignId, authenticatedUserId) {
  const affectedIds = [...new Set([...previousIds, ...nextIds])];

  for (const entityId of affectedIds) {
    const entity = await model.findById(entityId);

    if (!entity || entity.active === false) {
      continue;
    }

    const currentCampaignIds = [...(entity.campaignIds ?? [])];
    const nextCampaignIds = currentCampaignIds.filter((currentCampaignId) => currentCampaignId !== campaignId);

    if (nextIds.includes(entityId)) {
      nextCampaignIds.push(campaignId);
    }

    await model.updateOne(
      { _id: entityId },
      {
        $set: {
          campaignIds: [...new Set(nextCampaignIds)],
          updatedBy: authenticatedUserId
        }
      }
    );
  }
}

async function resolveRelationshipsOrThrow(data, launchId) {
  const relationships = {
    creativeIds: uniqueStrings(data.creativeIds),
    audienceIds: uniqueStrings(data.audienceIds),
    pixelIds: uniqueStrings(data.pixelIds),
    conversionEventIds: uniqueStrings(data.conversionEventIds)
  };

  await resolveCreativesOrThrow(relationships.creativeIds, launchId);
  await resolveAudiencesOrThrow(relationships.audienceIds, launchId);
  await resolvePixelsOrThrow(relationships.pixelIds, launchId);
  await resolveConversionEventsOrThrow(relationships.conversionEventIds, launchId);

  return relationships;
}

function createHistoryEntry({ action, campaign = {}, updates = {}, actedBy, reason = null }) {
  return {
    id: randomUUID(),
    action,
    fromStatus: campaign.status ?? null,
    toStatus: updates.status ?? campaign.status ?? null,
    fromPeriodStart: campaign.periodStart ?? null,
    toPeriodStart: updates.periodStart ?? campaign.periodStart ?? null,
    fromPeriodEnd: campaign.periodEnd ?? null,
    toPeriodEnd: updates.periodEnd ?? campaign.periodEnd ?? null,
    reason,
    actedBy,
    actedAt: new Date()
  };
}

class TrafficCampaignService {
  async create(authenticatedUserId, data) {
    await ensureLaunchExists(data.launchId);

    const periodStart = normalizeDate(data.periodStart);
    const periodEnd = normalizeDate(data.periodEnd);
    ensureValidPeriod(periodStart, periodEnd);

    const relationships = await resolveRelationshipsOrThrow(data, data.launchId);

    const campaignPayload = {
      launchId: data.launchId,
      name: data.name.trim(),
      objective: data.objective.trim(),
      channel: normalizeUpper(data.channel),
      periodStart,
      periodEnd,
      status: normalizeUpper(data.status),
      budget: data.budget ?? null,
      externalCampaignId: normalizeOptionalString(data.externalCampaignId),
      ...relationships,
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "CREATED",
      updates: campaignPayload,
      actedBy: authenticatedUserId
    });

    const campaign = await TrafficCampaign.create({
      ...campaignPayload,
      history: [historyEntry]
    });

    await syncCreativeRelationships([], relationships.creativeIds, campaign.id, authenticatedUserId);
    await syncArrayRelationships(TrafficAudience, [], relationships.audienceIds, campaign.id, authenticatedUserId);
    await syncArrayRelationships(TrafficPixel, [], relationships.pixelIds, campaign.id, authenticatedUserId);
    await syncArrayRelationships(TrafficConversionEvent, [], relationships.conversionEventIds, campaign.id, authenticatedUserId);

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_CAMPAIGN_CREATED",
      targetType: "TRAFFIC_CAMPAIGN",
      targetId: campaign.id,
      context: {
        launchId: campaign.launchId,
        channel: campaign.channel,
        status: campaign.status,
        periodStart: campaign.periodStart,
        periodEnd: campaign.periodEnd
      }
    });

    return toPublicTrafficCampaign(campaign);
  }

  async list(filters = {}) {
    const query = {
      active: true
    };

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.status) {
      query.status = normalizeUpper(filters.status);
    }

    if (filters.channel) {
      query.channel = normalizeUpper(filters.channel);
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const campaigns = await TrafficCampaign.find(query).sort({ periodStart: 1, createdAt: -1 });

    return campaigns.map((campaign) => toPublicTrafficCampaign(campaign));
  }

  async update(authenticatedUserId, campaignId, data) {
    const campaign = await TrafficCampaign.findById(campaignId);

    if (!campaign || !campaign.active) {
      throw {
        statusCode: 404,
        message: "Traffic campaign not found"
      };
    }

    const relationships =
      data.creativeIds !== undefined ||
      data.audienceIds !== undefined ||
      data.pixelIds !== undefined ||
      data.conversionEventIds !== undefined
        ? await resolveRelationshipsOrThrow(
            {
              creativeIds: data.creativeIds ?? campaign.creativeIds ?? [],
              audienceIds: data.audienceIds ?? campaign.audienceIds ?? [],
              pixelIds: data.pixelIds ?? campaign.pixelIds ?? [],
              conversionEventIds: data.conversionEventIds ?? campaign.conversionEventIds ?? []
            },
            campaign.launchId
          )
        : {
            creativeIds: [...(campaign.creativeIds ?? [])],
            audienceIds: [...(campaign.audienceIds ?? [])],
            pixelIds: [...(campaign.pixelIds ?? [])],
            conversionEventIds: [...(campaign.conversionEventIds ?? [])]
          };

    const updates = {
      name: data.name?.trim() ?? campaign.name,
      objective: data.objective?.trim() ?? campaign.objective,
      channel: data.channel ? normalizeUpper(data.channel) : campaign.channel,
      periodStart: data.periodStart ? normalizeDate(data.periodStart) : campaign.periodStart,
      periodEnd: data.periodEnd ? normalizeDate(data.periodEnd) : campaign.periodEnd,
      status: data.status ? normalizeUpper(data.status) : campaign.status,
      budget: data.budget !== undefined ? data.budget : campaign.budget ?? null,
      externalCampaignId:
        data.externalCampaignId !== undefined ? normalizeOptionalString(data.externalCampaignId) : campaign.externalCampaignId ?? null,
      ...relationships,
      updatedBy: authenticatedUserId
    };

    ensureValidPeriod(updates.periodStart, updates.periodEnd);

    const historyEntry = createHistoryEntry({
      action: "UPDATED",
      campaign,
      updates,
      actedBy: authenticatedUserId,
      reason: normalizeOptionalString(data.reason)
    });
    const nextHistory = [...campaign.history, historyEntry];

    await TrafficCampaign.updateOne(
      { _id: campaignId },
      {
        $set: {
          ...updates,
          history: nextHistory
        }
      }
    );

    await syncCreativeRelationships(campaign.creativeIds ?? [], relationships.creativeIds, campaignId, authenticatedUserId);
    await syncArrayRelationships(TrafficAudience, campaign.audienceIds ?? [], relationships.audienceIds, campaignId, authenticatedUserId);
    await syncArrayRelationships(TrafficPixel, campaign.pixelIds ?? [], relationships.pixelIds, campaignId, authenticatedUserId);
    await syncArrayRelationships(
      TrafficConversionEvent,
      campaign.conversionEventIds ?? [],
      relationships.conversionEventIds,
      campaignId,
      authenticatedUserId
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_CAMPAIGN_UPDATED",
      targetType: "TRAFFIC_CAMPAIGN",
      targetId: campaign.id,
      context: {
        launchId: campaign.launchId,
        previousStatus: campaign.status,
        status: updates.status,
        previousPeriodStart: campaign.periodStart,
        periodStart: updates.periodStart,
        previousPeriodEnd: campaign.periodEnd,
        periodEnd: updates.periodEnd
      }
    });

    return toPublicTrafficCampaign({
      ...campaign.toObject(),
      ...updates,
      history: nextHistory
    });
  }

  async deactivate(authenticatedUserId, campaignId) {
    const campaign = await TrafficCampaign.findById(campaignId);

    if (!campaign) {
      throw {
        statusCode: 404,
        message: "Traffic campaign not found"
      };
    }

    if (!campaign.active) {
      throw {
        statusCode: 409,
        message: "Traffic campaign is already inactive"
      };
    }

    const deactivatedAt = new Date();
    const historyEntry = createHistoryEntry({
      action: "DEACTIVATED",
      campaign,
      updates: {
        status: "CANCELED",
        periodStart: campaign.periodStart,
        periodEnd: campaign.periodEnd
      },
      actedBy: authenticatedUserId
    });
    const nextHistory = [...campaign.history, historyEntry];

    await TrafficCampaign.updateOne(
      { _id: campaignId },
      {
        $set: {
          status: "CANCELED",
          active: false,
          deactivatedAt,
          history: nextHistory,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_CAMPAIGN_DEACTIVATED",
      targetType: "TRAFFIC_CAMPAIGN",
      targetId: campaign.id,
      context: {
        launchId: campaign.launchId,
        previousStatus: campaign.status,
        status: "CANCELED"
      }
    });

    return toPublicTrafficCampaign({
      ...campaign.toObject(),
      status: "CANCELED",
      active: false,
      deactivatedAt,
      history: nextHistory,
      updatedBy: authenticatedUserId
    });
  }
}

export const trafficCampaignService = new TrafficCampaignService();
export { toPublicTrafficCampaign };

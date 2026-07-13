import { randomUUID } from "node:crypto";

import { Launch } from "../models/launch.model.js";
import { TrafficAudience } from "../models/traffic-audience.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
import { auditService } from "./audit.service.js";

function normalizeUpper(value) {
  return value.trim().toUpperCase();
}

function normalizeOptionalString(value) {
  return value ? value.trim() : null;
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeCriteria(criteria = {}) {
  return {
    demographics: uniqueStrings(criteria.demographics),
    interests: uniqueStrings(criteria.interests),
    behaviors: uniqueStrings(criteria.behaviors),
    locations: uniqueStrings(criteria.locations),
    exclusions: uniqueStrings(criteria.exclusions),
    lookalikeSource: normalizeOptionalString(criteria.lookalikeSource),
    customRules: uniqueStrings(criteria.customRules)
  };
}

function hasMinimumCriteria(criteria) {
  return (
    criteria.demographics.length > 0 ||
    criteria.interests.length > 0 ||
    criteria.behaviors.length > 0 ||
    criteria.locations.length > 0 ||
    criteria.exclusions.length > 0 ||
    Boolean(criteria.lookalikeSource) ||
    criteria.customRules.length > 0
  );
}

function ensureMinimumCriteria(criteria) {
  if (!hasMinimumCriteria(criteria)) {
    throw {
      statusCode: 400,
      message: "Traffic audience requires at least one segmentation criterion"
    };
  }
}

function toPublicCriteria(criteria = {}) {
  return {
    demographics: [...(criteria.demographics ?? [])],
    interests: [...(criteria.interests ?? [])],
    behaviors: [...(criteria.behaviors ?? [])],
    locations: [...(criteria.locations ?? [])],
    exclusions: [...(criteria.exclusions ?? [])],
    lookalikeSource: criteria.lookalikeSource ?? null,
    customRules: [...(criteria.customRules ?? [])]
  };
}

function toPublicHistoryEntry(entry) {
  return {
    id: entry.id,
    action: entry.action,
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus ?? null,
    campaignIdsSnapshot: [...(entry.campaignIdsSnapshot ?? [])],
    strategySnapshot: entry.strategySnapshot ?? null,
    criteriaSnapshot: toPublicCriteria(entry.criteriaSnapshot),
    reason: entry.reason ?? null,
    actedBy: entry.actedBy,
    actedAt: entry.actedAt
  };
}

function toPublicTrafficAudience(audience) {
  return {
    id: audience.id,
    launchId: audience.launchId,
    campaignIds: [...audience.campaignIds],
    name: audience.name,
    objective: audience.objective,
    strategy: audience.strategy,
    segmentationCriteria: toPublicCriteria(audience.segmentationCriteria),
    status: audience.status,
    active: audience.active,
    deactivatedAt: audience.deactivatedAt ?? null,
    history: audience.history.map((entry) => toPublicHistoryEntry(entry)),
    createdAt: audience.createdAt,
    updatedAt: audience.updatedAt,
    createdBy: audience.createdBy ?? null,
    updatedBy: audience.updatedBy ?? null
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
      message: "Audience campaigns must belong to the informed launch"
    };
  }

  return data.launchId ?? campaignLaunchIds[0] ?? null;
}

function createHistoryEntry({ action, audience = {}, updates = {}, actedBy, reason = null }) {
  return {
    id: randomUUID(),
    action,
    fromStatus: audience.status ?? null,
    toStatus: updates.status ?? audience.status ?? null,
    campaignIdsSnapshot: [...(updates.campaignIds ?? audience.campaignIds ?? [])],
    strategySnapshot: updates.strategy ?? audience.strategy ?? null,
    criteriaSnapshot: updates.segmentationCriteria ?? audience.segmentationCriteria ?? {},
    reason,
    actedBy,
    actedAt: new Date()
  };
}

class TrafficAudienceService {
  async create(authenticatedUserId, data) {
    const campaignIds = uniqueStrings(data.campaignIds);
    const campaigns = await resolveCampaignsOrThrow(campaignIds);
    const launchId = resolveLaunchId(data, campaigns);

    if (!launchId) {
      throw {
        statusCode: 400,
        message: "Traffic audience requires a launch or campaign context"
      };
    }

    await ensureLaunchExists(launchId);

    const segmentationCriteria = normalizeCriteria(data.segmentationCriteria);
    ensureMinimumCriteria(segmentationCriteria);

    const audiencePayload = {
      launchId,
      campaignIds,
      name: data.name.trim(),
      objective: data.objective.trim(),
      strategy: data.strategy.trim(),
      segmentationCriteria,
      status: data.status ? normalizeUpper(data.status) : "DRAFT",
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "CREATED",
      updates: audiencePayload,
      actedBy: authenticatedUserId
    });

    const audience = await TrafficAudience.create({
      ...audiencePayload,
      history: [historyEntry]
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_AUDIENCE_CREATED",
      targetType: "TRAFFIC_AUDIENCE",
      targetId: audience.id,
      context: {
        launchId: audience.launchId,
        campaignIds: audience.campaignIds,
        status: audience.status
      }
    });

    return toPublicTrafficAudience(audience);
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

    if (filters.status) {
      query.status = normalizeUpper(filters.status);
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const audiences = await TrafficAudience.find(query).sort({ createdAt: -1, name: 1 });

    return audiences.map((audience) => toPublicTrafficAudience(audience));
  }

  async update(authenticatedUserId, audienceId, data) {
    const audience = await TrafficAudience.findById(audienceId);

    if (!audience || !audience.active) {
      throw {
        statusCode: 404,
        message: "Traffic audience not found"
      };
    }

    const campaignIds = data.campaignIds !== undefined ? uniqueStrings(data.campaignIds) : [...audience.campaignIds];
    const campaigns = await resolveCampaignsOrThrow(campaignIds);

    if (campaigns.some((campaign) => campaign.launchId !== audience.launchId)) {
      throw {
        statusCode: 409,
        message: "Audience campaigns must belong to the audience launch"
      };
    }

    const segmentationCriteria =
      data.segmentationCriteria !== undefined
        ? normalizeCriteria(data.segmentationCriteria)
        : normalizeCriteria(audience.segmentationCriteria);
    ensureMinimumCriteria(segmentationCriteria);

    const updates = {
      campaignIds,
      objective: data.objective?.trim() ?? audience.objective,
      strategy: data.strategy?.trim() ?? audience.strategy,
      segmentationCriteria,
      status: data.status ? normalizeUpper(data.status) : audience.status,
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "UPDATED",
      audience,
      updates,
      actedBy: authenticatedUserId,
      reason: normalizeOptionalString(data.reason)
    });
    const nextHistory = [...audience.history, historyEntry];

    await TrafficAudience.updateOne(
      { _id: audienceId },
      {
        $set: {
          ...updates,
          history: nextHistory
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_AUDIENCE_UPDATED",
      targetType: "TRAFFIC_AUDIENCE",
      targetId: audience.id,
      context: {
        launchId: audience.launchId,
        previousStatus: audience.status,
        status: updates.status,
        campaignIds: updates.campaignIds
      }
    });

    return toPublicTrafficAudience({
      ...audience.toObject(),
      ...updates,
      history: nextHistory
    });
  }

  async deactivate(authenticatedUserId, audienceId) {
    const audience = await TrafficAudience.findById(audienceId);

    if (!audience) {
      throw {
        statusCode: 404,
        message: "Traffic audience not found"
      };
    }

    if (!audience.active) {
      throw {
        statusCode: 409,
        message: "Traffic audience is already inactive"
      };
    }

    const deactivatedAt = new Date();
    const historyEntry = createHistoryEntry({
      action: "DEACTIVATED",
      audience,
      updates: {
        status: "ARCHIVED",
        campaignIds: audience.campaignIds,
        strategy: audience.strategy,
        segmentationCriteria: audience.segmentationCriteria
      },
      actedBy: authenticatedUserId
    });
    const nextHistory = [...audience.history, historyEntry];

    await TrafficAudience.updateOne(
      { _id: audienceId },
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
      action: "TRAFFIC_AUDIENCE_DEACTIVATED",
      targetType: "TRAFFIC_AUDIENCE",
      targetId: audience.id,
      context: {
        launchId: audience.launchId,
        previousStatus: audience.status,
        status: "ARCHIVED"
      }
    });

    return toPublicTrafficAudience({
      ...audience.toObject(),
      status: "ARCHIVED",
      active: false,
      deactivatedAt,
      history: nextHistory,
      updatedBy: authenticatedUserId
    });
  }
}

export const trafficAudienceService = new TrafficAudienceService();

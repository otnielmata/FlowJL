import { randomUUID } from "node:crypto";

import { AssetLibraryItem } from "../models/asset-library-item.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
import { TrafficCreative } from "../models/traffic-creative.model.js";
import { auditService } from "./audit.service.js";

function normalizeUpper(value) {
  return value.trim().toUpperCase();
}

function normalizeOptionalString(value) {
  return value ? value.trim() : null;
}

function normalizePerformance(performance = {}) {
  return {
    impressions: performance.impressions ?? 0,
    clicks: performance.clicks ?? 0,
    conversions: performance.conversions ?? 0,
    spend: performance.spend ?? 0
  };
}

function toPublicHistoryEntry(entry) {
  return {
    id: entry.id,
    action: entry.action,
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus ?? null,
    fromClassification: entry.fromClassification ?? null,
    toClassification: entry.toClassification ?? null,
    reason: entry.reason ?? null,
    actedBy: entry.actedBy,
    actedAt: entry.actedAt
  };
}

function toPublicTrafficCreative(creative) {
  return {
    id: creative.id,
    campaignId: creative.campaignId,
    launchId: creative.launchId,
    assetId: creative.assetId ?? null,
    name: creative.name,
    format: creative.format,
    objective: creative.objective,
    origin: creative.origin,
    status: creative.status,
    classification: creative.classification,
    performance: {
      impressions: creative.performance?.impressions ?? 0,
      clicks: creative.performance?.clicks ?? 0,
      conversions: creative.performance?.conversions ?? 0,
      spend: creative.performance?.spend ?? 0
    },
    history: creative.history.map((entry) => toPublicHistoryEntry(entry)),
    active: creative.active,
    deactivatedAt: creative.deactivatedAt ?? null,
    createdAt: creative.createdAt,
    updatedAt: creative.updatedAt,
    createdBy: creative.createdBy ?? null,
    updatedBy: creative.updatedBy ?? null
  };
}

async function resolveCampaignOrThrow(campaignId) {
  const campaign = await TrafficCampaign.findById(campaignId);

  if (!campaign || !campaign.active) {
    throw {
      statusCode: 404,
      message: "Traffic campaign not found"
    };
  }

  return campaign;
}

async function ensureAssetExists(assetId) {
  if (!assetId) {
    return null;
  }

  const asset = await AssetLibraryItem.findById(assetId);

  if (!asset || !asset.active) {
    throw {
      statusCode: 404,
      message: "Asset not found"
    };
  }

  return asset;
}

function createHistoryEntry({ action, creative = {}, updates = {}, actedBy, reason = null }) {
  return {
    id: randomUUID(),
    action,
    fromStatus: creative.status ?? null,
    toStatus: updates.status ?? creative.status ?? null,
    fromClassification: creative.classification ?? null,
    toClassification: updates.classification ?? creative.classification ?? null,
    reason,
    actedBy,
    actedAt: new Date()
  };
}

class TrafficCreativeService {
  async create(authenticatedUserId, data) {
    const campaign = await resolveCampaignOrThrow(data.campaignId);
    await ensureAssetExists(data.assetId ?? null);

    const creativePayload = {
      campaignId: campaign.id,
      launchId: campaign.launchId,
      assetId: data.assetId ?? null,
      name: data.name.trim(),
      format: normalizeUpper(data.format),
      objective: data.objective.trim(),
      origin: normalizeUpper(data.origin),
      status: normalizeUpper(data.status),
      classification: data.classification ? normalizeUpper(data.classification) : "UNTESTED",
      performance: normalizePerformance(data.performance),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "CREATED",
      updates: creativePayload,
      actedBy: authenticatedUserId
    });

    const creative = await TrafficCreative.create({
      ...creativePayload,
      history: [historyEntry]
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_CREATIVE_CREATED",
      targetType: "TRAFFIC_CREATIVE",
      targetId: creative.id,
      context: {
        campaignId: creative.campaignId,
        launchId: creative.launchId,
        assetId: creative.assetId,
        format: creative.format,
        status: creative.status,
        classification: creative.classification
      }
    });

    return toPublicTrafficCreative(creative);
  }

  async list(filters = {}) {
    const query = {
      active: true
    };

    if (filters.campaignId) {
      query.campaignId = filters.campaignId;
    }

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.status) {
      query.status = normalizeUpper(filters.status);
    }

    if (filters.classification) {
      query.classification = normalizeUpper(filters.classification);
    }

    if (filters.format) {
      query.format = normalizeUpper(filters.format);
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const creatives = await TrafficCreative.find(query).sort({ createdAt: -1, name: 1 });

    return creatives.map((creative) => toPublicTrafficCreative(creative));
  }

  async update(authenticatedUserId, creativeId, data) {
    const creative = await TrafficCreative.findById(creativeId);

    if (!creative || !creative.active) {
      throw {
        statusCode: 404,
        message: "Traffic creative not found"
      };
    }

    await ensureAssetExists(data.assetId ?? null);

    const updates = {
      assetId: data.assetId !== undefined ? data.assetId : creative.assetId ?? null,
      objective: data.objective?.trim() ?? creative.objective,
      status: data.status ? normalizeUpper(data.status) : creative.status,
      classification: data.classification ? normalizeUpper(data.classification) : creative.classification,
      performance: data.performance ? normalizePerformance(data.performance) : normalizePerformance(creative.performance),
      updatedBy: authenticatedUserId
    };
    const historyEntry = createHistoryEntry({
      action: "UPDATED",
      creative,
      updates,
      actedBy: authenticatedUserId,
      reason: normalizeOptionalString(data.reason)
    });
    const nextHistory = [...creative.history, historyEntry];

    await TrafficCreative.updateOne(
      { _id: creativeId },
      {
        $set: {
          ...updates,
          history: nextHistory
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "TRAFFIC_CREATIVE_UPDATED",
      targetType: "TRAFFIC_CREATIVE",
      targetId: creative.id,
      context: {
        campaignId: creative.campaignId,
        launchId: creative.launchId,
        previousStatus: creative.status,
        status: updates.status,
        previousClassification: creative.classification,
        classification: updates.classification
      }
    });

    return toPublicTrafficCreative({
      ...creative.toObject(),
      ...updates,
      history: nextHistory
    });
  }

  async deactivate(authenticatedUserId, creativeId) {
    const creative = await TrafficCreative.findById(creativeId);

    if (!creative) {
      throw {
        statusCode: 404,
        message: "Traffic creative not found"
      };
    }

    if (!creative.active) {
      throw {
        statusCode: 409,
        message: "Traffic creative is already inactive"
      };
    }

    const deactivatedAt = new Date();
    const historyEntry = createHistoryEntry({
      action: "DEACTIVATED",
      creative,
      updates: {
        status: "ARCHIVED",
        classification: creative.classification
      },
      actedBy: authenticatedUserId
    });
    const nextHistory = [...creative.history, historyEntry];

    await TrafficCreative.updateOne(
      { _id: creativeId },
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
      action: "TRAFFIC_CREATIVE_DEACTIVATED",
      targetType: "TRAFFIC_CREATIVE",
      targetId: creative.id,
      context: {
        campaignId: creative.campaignId,
        launchId: creative.launchId,
        previousStatus: creative.status,
        status: "ARCHIVED"
      }
    });

    return toPublicTrafficCreative({
      ...creative.toObject(),
      status: "ARCHIVED",
      active: false,
      deactivatedAt,
      history: nextHistory,
      updatedBy: authenticatedUserId
    });
  }
}

export const trafficCreativeService = new TrafficCreativeService();
export { toPublicTrafficCreative };

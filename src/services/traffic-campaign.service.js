import { randomUUID } from "node:crypto";

import { Launch } from "../models/launch.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
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

    const updates = {
      objective: data.objective?.trim() ?? campaign.objective,
      periodStart: data.periodStart ? normalizeDate(data.periodStart) : campaign.periodStart,
      periodEnd: data.periodEnd ? normalizeDate(data.periodEnd) : campaign.periodEnd,
      status: data.status ? normalizeUpper(data.status) : campaign.status,
      budget: data.budget !== undefined ? data.budget : campaign.budget ?? null,
      externalCampaignId:
        data.externalCampaignId !== undefined ? normalizeOptionalString(data.externalCampaignId) : campaign.externalCampaignId ?? null,
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

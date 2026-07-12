import { EmailCampaign } from "../models/email-campaign.model.js";
import { Launch } from "../models/launch.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function toPublicEmailCampaign(email) {
  return {
    id: email.id,
    launchId: email.launchId,
    type: email.type,
    subject: email.subject,
    objective: email.objective,
    cta: email.cta,
    body: email.body ?? null,
    status: email.status,
    reviewStatus: email.reviewStatus,
    plannedSendAt: email.plannedSendAt ?? null,
    active: email.active,
    deactivatedAt: email.deactivatedAt ?? null,
    createdAt: email.createdAt,
    updatedAt: email.updatedAt,
    createdBy: email.createdBy ?? null,
    updatedBy: email.updatedBy ?? null
  };
}

async function ensureLaunchExists(launchId) {
  const launch = await Launch.findById(launchId);

  if (!launch) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }
}

class EmailCampaignService {
  async create(authenticatedUserId, data) {
    await ensureLaunchExists(data.launchId);

    const email = await EmailCampaign.create({
      launchId: data.launchId,
      type: data.type.trim().toUpperCase(),
      subject: data.subject.trim(),
      objective: data.objective.trim(),
      cta: data.cta.trim(),
      body: data.body?.trim() ?? null,
      status: data.status.trim().toUpperCase(),
      reviewStatus: data.reviewStatus?.trim().toUpperCase() ?? "PENDING",
      plannedSendAt: normalizeDate(data.plannedSendAt),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "EMAIL_CAMPAIGN_CREATED",
      targetType: "EMAIL_CAMPAIGN",
      targetId: email.id,
      context: {
        launchId: email.launchId,
        type: email.type,
        status: email.status,
        reviewStatus: email.reviewStatus
      }
    });

    return toPublicEmailCampaign(email);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.type) {
      query.type = filters.type.trim().toUpperCase();
    }

    if (filters.status) {
      query.status = filters.status.trim().toUpperCase();
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const emails = await EmailCampaign.find(query).sort({ plannedSendAt: 1, createdAt: -1 });
    return emails.map((email) => toPublicEmailCampaign(email));
  }

  async deactivate(authenticatedUserId, emailId) {
    const email = await EmailCampaign.findById(emailId);

    if (!email) {
      throw {
        statusCode: 404,
        message: "Email campaign not found"
      };
    }

    if (!email.active) {
      throw {
        statusCode: 409,
        message: "Email campaign is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await EmailCampaign.updateOne(
      { _id: emailId },
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
      action: "EMAIL_CAMPAIGN_DEACTIVATED",
      targetType: "EMAIL_CAMPAIGN",
      targetId: email.id,
      context: {
        launchId: email.launchId,
        type: email.type,
        status: email.status
      }
    });

    return {
      ...toPublicEmailCampaign(email),
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    };
  }
}

export const emailCampaignService = new EmailCampaignService();
export { toPublicEmailCampaign };

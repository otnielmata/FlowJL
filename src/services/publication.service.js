import { randomUUID } from "node:crypto";

import { Carousel } from "../models/carousel.model.js";
import { ContentApproval } from "../models/content-approval.model.js";
import { EmailCampaign } from "../models/email-campaign.model.js";
import { Publication } from "../models/publication.model.js";
import { Reel } from "../models/reel.model.js";
import { StorySequence } from "../models/story-sequence.model.js";
import { YouTubeContent } from "../models/youtube-content.model.js";
import { auditService } from "./audit.service.js";

const contentHandlers = {
  REEL: {
    model: Reel,
    titleField: "theme",
    statusField: "operationalStatus",
    scheduleField: "scheduledAt",
    publishedStatus: "PUBLISHED",
    scheduledStatus: "SCHEDULED"
  },
  CAROUSEL: {
    model: Carousel,
    titleField: "theme",
    statusField: "operationalStatus",
    publishedStatus: "PUBLISHED",
    scheduledStatus: "SCHEDULED"
  },
  STORY_SEQUENCE: {
    model: StorySequence,
    titleField: "theme",
    statusField: "operationalStatus",
    scheduleField: "publishAt",
    publishedStatus: "PUBLISHED",
    scheduledStatus: "SCHEDULED"
  },
  EMAIL_CAMPAIGN: {
    model: EmailCampaign,
    titleField: "subject",
    statusField: "status",
    scheduleField: "plannedSendAt",
    publishedStatus: "SENT",
    scheduledStatus: "SCHEDULED"
  },
  YOUTUBE_CONTENT: {
    model: YouTubeContent,
    titleField: "theme",
    statusField: "operationalStatus",
    scheduleField: "publishAt",
    publishedStatus: "PUBLISHED",
    scheduledStatus: "SCHEDULED"
  }
};

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeString(value) {
  return value?.trim() ?? null;
}

function toPublicContent(contentType, content, handler) {
  return {
    id: content.id,
    type: contentType,
    launchId: content.launchId ?? null,
    title: content[handler.titleField],
    status: content[handler.statusField] ?? null
  };
}

function toPublicPublication(publication, content, approvalStatus) {
  return {
    id: publication.id,
    launchId: publication.launchId,
    contentType: publication.contentType,
    contentId: publication.contentId,
    channel: publication.channel,
    publishAt: publication.publishAt,
    responsible: publication.responsible,
    status: publication.status,
    issueReason: publication.issueReason ?? null,
    publishedAt: publication.publishedAt ?? null,
    active: publication.active,
    approvalStatus,
    content,
    createdAt: publication.createdAt,
    updatedAt: publication.updatedAt,
    createdBy: publication.createdBy ?? null,
    updatedBy: publication.updatedBy ?? null
  };
}

function normalizeStatus(value) {
  return value.trim().toUpperCase();
}

async function resolveContentOrThrow(contentType, contentId) {
  const handler = contentHandlers[contentType];

  if (!handler) {
    throw {
      statusCode: 400,
      message: "Unsupported content type"
    };
  }

  const content = await handler.model.findById(contentId);

  if (!content || content.active === false) {
    throw {
      statusCode: 404,
      message: "Content not found"
    };
  }

  if (!content.launchId) {
    throw {
      statusCode: 400,
      message: "Publication requires content with launch context"
    };
  }

  return {
    handler,
    content
  };
}

async function getApprovalOrThrow(contentType, contentId) {
  const approval = await ContentApproval.findOne({
    contentType,
    contentId,
    active: true
  });

  if (!approval || !["APPROVED", "PUBLISHED"].includes(approval.currentStatus)) {
    throw {
      statusCode: 409,
      message: "Content must be approved before publication"
    };
  }

  return approval;
}

async function syncContentState(contentType, contentId, handler, status, publishAt, authenticatedUserId) {
  const contentUpdates = {
    updatedBy: authenticatedUserId
  };

  if (handler.scheduleField) {
    contentUpdates[handler.scheduleField] = publishAt;
  }

  if (status === "SCHEDULED") {
    contentUpdates[handler.statusField] = handler.scheduledStatus;
  }

  if (status === "PUBLISHED") {
    contentUpdates[handler.statusField] = handler.publishedStatus;
  }

  await handler.model.updateOne(
    { _id: contentId },
    {
      $set: contentUpdates
    }
  );
}

async function syncApprovalAsPublished(authenticatedUserId, approval, contentType, contentId, launchId) {
  if (approval.currentStatus === "PUBLISHED") {
    return approval.currentStatus;
  }

  const historyEntry = {
    id: randomUUID(),
    fromStatus: approval.currentStatus,
    toStatus: "PUBLISHED",
    observations: null,
    actorPermission: "CONTENT_APPROVAL_PUBLISH",
    actedBy: authenticatedUserId,
    actedAt: new Date()
  };

  const nextHistory = [...approval.history, historyEntry];

  await ContentApproval.updateOne(
    { _id: approval.id },
    {
      $set: {
        currentStatus: "PUBLISHED",
        history: nextHistory,
        updatedBy: authenticatedUserId
      }
    }
  );

  await auditService.record({
    actorUserId: authenticatedUserId,
    action: "CONTENT_APPROVAL_STATUS_CHANGED",
    targetType: "CONTENT_APPROVAL",
    targetId: approval.id,
    context: {
      contentType,
      contentId,
      launchId,
      fromStatus: approval.currentStatus,
      toStatus: "PUBLISHED"
    }
  });

  return "PUBLISHED";
}

class PublicationService {
  async create(authenticatedUserId, data) {
    const contentType = normalizeStatus(data.contentType);
    const { handler, content } = await resolveContentOrThrow(contentType, data.contentId);
    const approval = await getApprovalOrThrow(contentType, data.contentId);
    const status = data.status ? normalizeStatus(data.status) : "PLANNED";
    const publishAt = normalizeDate(data.publishAt);
    const publishedAt = status === "PUBLISHED" ? publishAt : null;

    const publication = await Publication.create({
      launchId: content.launchId,
      contentType,
      contentId: data.contentId,
      channel: data.channel.trim(),
      publishAt,
      responsible: data.responsible.trim(),
      status,
      issueReason: normalizeString(data.issueReason),
      publishedAt,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await syncContentState(contentType, data.contentId, handler, status, publishAt, authenticatedUserId);

    const approvalStatus =
      status === "PUBLISHED"
        ? await syncApprovalAsPublished(authenticatedUserId, approval, contentType, data.contentId, content.launchId)
        : approval.currentStatus;

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "PUBLICATION_CREATED",
      targetType: "PUBLICATION",
      targetId: publication.id,
      context: {
        launchId: publication.launchId,
        contentType: publication.contentType,
        contentId: publication.contentId,
        channel: publication.channel,
        status: publication.status,
        publishAt: publication.publishAt
      }
    });

    return toPublicPublication(publication, toPublicContent(contentType, content, handler), approvalStatus);
  }

  async list(filters = {}) {
    const query = {
      active: true
    };

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.status) {
      query.status = normalizeStatus(filters.status);
    }

    if (filters.channel) {
      query.channel = filters.channel.trim();
    }

    if (filters.startAt || filters.endAt) {
      query.publishAt = {};
      if (filters.startAt) {
        query.publishAt.$gte = normalizeDate(filters.startAt);
      }
      if (filters.endAt) {
        query.publishAt.$lte = normalizeDate(filters.endAt);
      }
    }

    const publications = await Publication.find(query).sort({ publishAt: 1, createdAt: -1 });
    const items = [];

    for (const publication of publications) {
      const { handler, content } = await resolveContentOrThrow(publication.contentType, publication.contentId);
      const approval = await ContentApproval.findOne({
        contentType: publication.contentType,
        contentId: publication.contentId,
        active: true
      });

      items.push(
        toPublicPublication(
          publication,
          toPublicContent(publication.contentType, content, handler),
          approval?.currentStatus ?? "CREATED"
        )
      );
    }

    return items;
  }

  async update(authenticatedUserId, publicationId, data) {
    const publication = await Publication.findById(publicationId);

    if (!publication || !publication.active) {
      throw {
        statusCode: 404,
        message: "Publication not found"
      };
    }

    const { handler, content } = await resolveContentOrThrow(publication.contentType, publication.contentId);
    const nextStatus = data.status ? normalizeStatus(data.status) : publication.status;
    const publishAt = data.publishAt ? normalizeDate(data.publishAt) : publication.publishAt;

    const approval =
      nextStatus === "PUBLISHED" || publication.status === "PUBLISHED" || nextStatus === "SCHEDULED"
        ? await getApprovalOrThrow(publication.contentType, publication.contentId)
        : await ContentApproval.findOne({
            contentType: publication.contentType,
            contentId: publication.contentId,
            active: true
          });

    const updates = {
      channel: data.channel?.trim() ?? publication.channel,
      publishAt,
      responsible: data.responsible?.trim() ?? publication.responsible,
      status: nextStatus,
      issueReason: data.issueReason !== undefined ? normalizeString(data.issueReason) : publication.issueReason,
      publishedAt: nextStatus === "PUBLISHED" ? publishAt : publication.publishedAt,
      updatedBy: authenticatedUserId
    };

    await Publication.updateOne(
      { _id: publicationId },
      {
        $set: updates
      }
    );

    await syncContentState(publication.contentType, publication.contentId, handler, nextStatus, publishAt, authenticatedUserId);

    let approvalStatus = approval?.currentStatus ?? "CREATED";

    if (nextStatus === "PUBLISHED" && approval) {
      approvalStatus = await syncApprovalAsPublished(
        authenticatedUserId,
        approval,
        publication.contentType,
        publication.contentId,
        publication.launchId
      );
    }

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "PUBLICATION_UPDATED",
      targetType: "PUBLICATION",
      targetId: publication.id,
      context: {
        launchId: publication.launchId,
        previousStatus: publication.status,
        status: updates.status,
        previousPublishAt: publication.publishAt,
        publishAt: updates.publishAt,
        previousResponsible: publication.responsible,
        responsible: updates.responsible,
        issueReason: updates.issueReason
      }
    });

    return toPublicPublication(
      {
        ...publication.toObject(),
        ...updates
      },
      toPublicContent(publication.contentType, content, handler),
      approvalStatus
    );
  }
}

export const publicationService = new PublicationService();

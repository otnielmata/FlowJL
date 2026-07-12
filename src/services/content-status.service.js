import { Carousel } from "../models/carousel.model.js";
import { ContentStatusHistory } from "../models/content-status-history.model.js";
import { EmailCampaign } from "../models/email-campaign.model.js";
import { ProductionChecklist } from "../models/production-checklist.model.js";
import { Reel } from "../models/reel.model.js";
import { StorySequence } from "../models/story-sequence.model.js";
import { YouTubeContent } from "../models/youtube-content.model.js";
import { auditService } from "./audit.service.js";

const contentHandlers = {
  REEL: {
    model: Reel,
    titleField: "theme",
    statusField: "operationalStatus",
    flow: ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"],
    publishedStatus: "PUBLISHED"
  },
  CAROUSEL: {
    model: Carousel,
    titleField: "theme",
    statusField: "operationalStatus",
    flow: ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"],
    publishedStatus: "PUBLISHED"
  },
  STORY_SEQUENCE: {
    model: StorySequence,
    titleField: "theme",
    statusField: "operationalStatus",
    flow: ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"],
    publishedStatus: "PUBLISHED"
  },
  EMAIL_CAMPAIGN: {
    model: EmailCampaign,
    titleField: "subject",
    statusField: "status",
    flow: ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "SENT"],
    publishedStatus: "SENT"
  },
  YOUTUBE_CONTENT: {
    model: YouTubeContent,
    titleField: "theme",
    statusField: "operationalStatus",
    flow: ["PLANNED", "SCRIPTING", "RECORDING", "EDITING", "SCHEDULED", "PUBLISHED"],
    publishedStatus: "PUBLISHED"
  }
};

function normalizeStatus(value) {
  return value.trim().toUpperCase();
}

function normalizeReason(value) {
  return value ? value.trim() : null;
}

function toPublicHistoryEntry(entry) {
  return {
    id: entry.id,
    launchId: entry.launchId ?? null,
    contentType: entry.contentType,
    contentId: entry.contentId,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    reason: entry.reason ?? null,
    changedBy: entry.changedBy,
    changedAt: entry.changedAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
}

function toPublicContentStatus(contentType, content, handler, history = []) {
  return {
    id: content.id,
    contentType,
    launchId: content.launchId ?? null,
    title: content[handler.titleField],
    status: content[handler.statusField],
    history: history.map(toPublicHistoryEntry),
    active: content.active,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    updatedBy: content.updatedBy ?? null
  };
}

function ensureTransitionAllowed(handler, fromStatus, toStatus) {
  if (!handler.flow.includes(toStatus)) {
    throw {
      statusCode: 400,
      message: "Unsupported target status"
    };
  }

  if (fromStatus === handler.publishedStatus) {
    throw {
      statusCode: 409,
      message: "Published content status cannot be changed"
    };
  }

  if (fromStatus === toStatus) {
    throw {
      statusCode: 409,
      message: "Content already has the requested status"
    };
  }

  const currentIndex = handler.flow.indexOf(fromStatus);
  const nextIndex = handler.flow.indexOf(toStatus);

  if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
    throw {
      statusCode: 409,
      message: "Invalid content status transition"
    };
  }
}

async function ensureContentCanBePublished(contentType, contentId, targetStatus, publishedStatus) {
  if (targetStatus !== publishedStatus) {
    return;
  }

  const checklist = await ProductionChecklist.findOne({
    contentType,
    contentId,
    active: true
  });

  if (!checklist || checklist.status !== "COMPLETED") {
    throw {
      statusCode: 409,
      message: "Production checklist must be completed before publication"
    };
  }
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

  return {
    handler,
    content
  };
}

class ContentStatusService {
  async changeStatus(authenticatedUserId, contentType, contentId, data) {
    const normalizedContentType = normalizeStatus(contentType);
    const { handler, content } = await resolveContentOrThrow(normalizedContentType, contentId);
    const fromStatus = content[handler.statusField];
    const toStatus = normalizeStatus(data.targetStatus);

    ensureTransitionAllowed(handler, fromStatus, toStatus);
    await ensureContentCanBePublished(normalizedContentType, contentId, toStatus, handler.publishedStatus);

    const historyEntry = await ContentStatusHistory.create({
      launchId: content.launchId ?? null,
      contentType: normalizedContentType,
      contentId,
      fromStatus,
      toStatus,
      reason: normalizeReason(data.reason),
      changedBy: authenticatedUserId,
      changedAt: new Date()
    });
    const updates = {
      [handler.statusField]: toStatus,
      updatedBy: authenticatedUserId
    };

    await handler.model.updateOne(
      { _id: contentId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_STATUS_CHANGED",
      targetType: normalizedContentType,
      targetId: content.id,
      context: {
        launchId: content.launchId ?? null,
        fromStatus,
        toStatus,
        historyId: historyEntry.id
      }
    });

    return toPublicContentStatus(
      normalizedContentType,
      {
        ...content.toObject(),
        ...updates
      },
      handler,
      [historyEntry]
    );
  }

  async listHistory(contentType, contentId) {
    const normalizedContentType = normalizeStatus(contentType);
    await resolveContentOrThrow(normalizedContentType, contentId);

    const history = await ContentStatusHistory.find({
      contentType: normalizedContentType,
      contentId
    }).sort({ changedAt: 1, createdAt: 1 });

    return history.map(toPublicHistoryEntry);
  }
}

export const contentStatusService = new ContentStatusService();

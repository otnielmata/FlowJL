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

function normalizeUniqueArray(values = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizePreview(preview = {}, fallback = {}) {
  return {
    headline: normalizeString(preview.headline) ?? fallback.headline ?? null,
    caption: normalizeString(preview.caption) ?? fallback.caption ?? null,
    callToAction: normalizeString(preview.callToAction) ?? fallback.callToAction ?? null,
    visualFormat: normalizeString(preview.visualFormat) ?? fallback.visualFormat ?? null,
    thumbnailUrl: normalizeString(preview.thumbnailUrl) ?? fallback.thumbnailUrl ?? null,
    hashtags: normalizeUniqueArray(preview.hashtags ?? fallback.hashtags ?? [])
  };
}

function normalizeMetrics(metrics = {}, currentMetrics = {}) {
  const hasNewMetrics = Object.keys(metrics).length > 0;

  return {
    publishedUrl: normalizeString(metrics.publishedUrl) ?? currentMetrics.publishedUrl ?? null,
    reach: metrics.reach ?? currentMetrics.reach ?? 0,
    likes: metrics.likes ?? currentMetrics.likes ?? 0,
    comments: metrics.comments ?? currentMetrics.comments ?? 0,
    shares: metrics.shares ?? currentMetrics.shares ?? 0,
    saves: metrics.saves ?? currentMetrics.saves ?? 0,
    recordedAt: hasNewMetrics ? new Date() : currentMetrics.recordedAt ?? null,
    recordedBy: metrics.recordedBy ?? currentMetrics.recordedBy ?? null
  };
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

function extractPreviewFromContent(contentType, content, channel) {
  if (contentType === "REEL") {
    return {
      headline: content.theme,
      caption: content.caption ?? content.hook ?? null,
      callToAction: content.cta ?? null,
      visualFormat: channel.includes("TIKTOK") ? "VERTICAL_VIDEO" : "SHORT_VIDEO",
      thumbnailUrl: null,
      hashtags: []
    };
  }

  if (contentType === "CAROUSEL") {
    return {
      headline: content.theme,
      caption: content.cards?.[0]?.message ?? null,
      callToAction: content.cta ?? null,
      visualFormat: "CAROUSEL",
      thumbnailUrl: null,
      hashtags: []
    };
  }

  if (contentType === "STORY_SEQUENCE") {
    return {
      headline: content.theme,
      caption: content.blocks?.map((block) => block.text).join(" / ") ?? null,
      callToAction: content.cta ?? null,
      visualFormat: "STORIES",
      thumbnailUrl: null,
      hashtags: []
    };
  }

  if (contentType === "EMAIL_CAMPAIGN") {
    return {
      headline: content.subject,
      caption: content.body ?? content.objective ?? null,
      callToAction: content.cta ?? null,
      visualFormat: "EMAIL",
      thumbnailUrl: null,
      hashtags: []
    };
  }

  return {
    headline: content.theme,
    caption: content.script ?? content.objective ?? null,
    callToAction: content.cta ?? null,
    visualFormat: channel.includes("SHORTS") ? "SHORT_VIDEO" : "LONG_VIDEO",
    thumbnailUrl: null,
    hashtags: []
  };
}

function buildHistoryEntry(actionType, actorUserId, message, metadata = {}) {
  return {
    id: randomUUID(),
    actionType,
    actorUserId,
    message,
    metadata,
    createdAt: new Date()
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
    approvalRequestedAt: publication.approvalRequestedAt ?? null,
    preview: publication.preview ?? normalizePreview(),
    metrics:
      publication.metrics ??
      {
        publishedUrl: null,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        recordedAt: null,
        recordedBy: null
      },
    history: (publication.history ?? []).map((entry) => ({
      id: entry.id,
      actionType: entry.actionType,
      actorUserId: entry.actorUserId ?? null,
      message: entry.message,
      metadata: entry.metadata ?? {},
      createdAt: entry.createdAt
    })),
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
    const preview = normalizePreview(data.preview, extractPreviewFromContent(contentType, content, data.channel.trim()));
    const history = [
      buildHistoryEntry(
        "PUBLICATION_CREATED",
        authenticatedUserId,
        status === "PLANNED" ? "Publicacao planejada." : "Publicacao criada com status operacional.",
        {
          channel: data.channel.trim(),
          status,
          publishAt
        }
      )
    ];

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
      approvalRequestedAt: data.approvalRequestedAt ? normalizeDate(data.approvalRequestedAt) : null,
      preview,
      metrics: {
        publishedUrl: null,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        recordedAt: null,
        recordedBy: null
      },
      history,
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
      approvalRequestedAt: data.approvalRequestedAt !== undefined ? normalizeDate(data.approvalRequestedAt) : publication.approvalRequestedAt,
      preview: data.preview
        ? normalizePreview(data.preview, extractPreviewFromContent(publication.contentType, content, data.channel?.trim() ?? publication.channel))
        : publication.preview ?? normalizePreview({}, extractPreviewFromContent(publication.contentType, content, publication.channel)),
      history: [
        ...(publication.history ?? []),
        buildHistoryEntry("PUBLICATION_UPDATED", authenticatedUserId, "Publicacao atualizada.", {
          previousStatus: publication.status,
          status: nextStatus,
          publishAt,
          responsible: data.responsible?.trim() ?? publication.responsible
        })
      ],
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

  async findByContent(contentType, contentId) {
    return Publication.findOne({
      contentType: normalizeStatus(contentType),
      contentId,
      active: true
    });
  }

  async recordMetrics(authenticatedUserId, publicationId, metrics) {
    const publication = await Publication.findById(publicationId);

    if (!publication || !publication.active) {
      throw {
        statusCode: 404,
        message: "Publication not found"
      };
    }

    if (publication.status !== "PUBLISHED") {
      throw {
        statusCode: 409,
        message: "Only published items can receive performance metrics"
      };
    }

    const { handler, content } = await resolveContentOrThrow(publication.contentType, publication.contentId);
    const nextMetrics = normalizeMetrics(
      {
        ...metrics,
        recordedBy: authenticatedUserId
      },
      publication.metrics ?? {}
    );
    const updates = {
      metrics: nextMetrics,
      history: [
        ...(publication.history ?? []),
        buildHistoryEntry("PUBLICATION_METRICS_RECORDED", authenticatedUserId, "Desempenho da publicacao registrado.", {
          publishedUrl: nextMetrics.publishedUrl,
          reach: nextMetrics.reach,
          likes: nextMetrics.likes,
          comments: nextMetrics.comments,
          shares: nextMetrics.shares,
          saves: nextMetrics.saves
        })
      ],
      updatedBy: authenticatedUserId
    };

    await Publication.updateOne(
      { _id: publicationId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "PUBLICATION_METRICS_RECORDED",
      targetType: "PUBLICATION",
      targetId: publication.id,
      context: {
        launchId: publication.launchId,
        contentType: publication.contentType,
        contentId: publication.contentId,
        publishedUrl: nextMetrics.publishedUrl,
        reach: nextMetrics.reach,
        likes: nextMetrics.likes,
        comments: nextMetrics.comments,
        shares: nextMetrics.shares,
        saves: nextMetrics.saves
      }
    });

    const approval = await ContentApproval.findOne({
      contentType: publication.contentType,
      contentId: publication.contentId,
      active: true
    });

    return toPublicPublication(
      {
        ...publication.toObject(),
        ...updates
      },
      toPublicContent(publication.contentType, content, handler),
      approval?.currentStatus ?? "CREATED"
    );
  }
}

export const publicationService = new PublicationService();

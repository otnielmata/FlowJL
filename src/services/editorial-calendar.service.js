import { Carousel } from "../models/carousel.model.js";
import { EditorialCalendarItem } from "../models/editorial-calendar-item.model.js";
import { EmailCampaign } from "../models/email-campaign.model.js";
import { Reel } from "../models/reel.model.js";
import { StorySequence } from "../models/story-sequence.model.js";
import { YouTubeContent } from "../models/youtube-content.model.js";
import { auditService } from "./audit.service.js";

const contentHandlers = {
  REEL: {
    model: Reel,
    titleField: "theme",
    statusField: "operationalStatus",
    scheduleField: "scheduledAt"
  },
  CAROUSEL: {
    model: Carousel,
    titleField: "theme",
    statusField: "operationalStatus"
  },
  STORY_SEQUENCE: {
    model: StorySequence,
    titleField: "theme",
    statusField: "operationalStatus",
    scheduleField: "publishAt"
  },
  EMAIL_CAMPAIGN: {
    model: EmailCampaign,
    titleField: "subject",
    statusField: "status",
    scheduleField: "plannedSendAt"
  },
  YOUTUBE_CONTENT: {
    model: YouTubeContent,
    titleField: "theme",
    statusField: "operationalStatus",
    scheduleField: "publishAt"
  }
};

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeString(value) {
  return value?.trim() ?? null;
}

function buildContentPreview(contentType, content, handler) {
  return {
    id: content.id,
    type: contentType,
    launchId: content.launchId,
    title: content[handler.titleField],
    status: content[handler.statusField] ?? null
  };
}

function toPublicCalendarItem(item, content) {
  return {
    id: item.id,
    launchId: item.launchId,
    contentType: item.contentType,
    contentId: item.contentId,
    channel: item.channel,
    publishAt: item.publishAt,
    responsible: item.responsible,
    notes: item.notes ?? null,
    active: item.active,
    content,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null
  };
}

function groupCalendarItems(items) {
  const groups = new Map();

  for (const item of items) {
    const dateKey = item.publishAt.toISOString().slice(0, 10);
    const existing = groups.get(dateKey) ?? [];
    existing.push(item);
    groups.set(dateKey, existing);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, groupedItems]) => ({
      date,
      items: groupedItems.sort((left, right) => {
        const timeDiff = left.publishAt.getTime() - right.publishAt.getTime();

        if (timeDiff !== 0) {
          return timeDiff;
        }

        return left.channel.localeCompare(right.channel);
      })
    }));
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
      message: "Base content not found"
    };
  }

  if (!content.launchId) {
    throw {
      statusCode: 400,
      message: "Editorial calendar item requires content with launch context"
    };
  }

  return {
    content,
    handler,
    publicContent: buildContentPreview(contentType, content, handler)
  };
}

async function syncBaseContentSchedule(contentType, contentId, handler, publishAt, authenticatedUserId) {
  if (!handler.scheduleField) {
    return;
  }

  await handler.model.updateOne(
    { _id: contentId },
    {
      $set: {
        [handler.scheduleField]: publishAt,
        updatedBy: authenticatedUserId
      }
    }
  );
}

class EditorialCalendarService {
  async create(authenticatedUserId, data) {
    const { content, handler, publicContent } = await resolveContentOrThrow(data.contentType, data.contentId);

    const item = await EditorialCalendarItem.create({
      launchId: content.launchId,
      contentType: data.contentType,
      contentId: data.contentId,
      channel: data.channel.trim(),
      publishAt: normalizeDate(data.publishAt),
      responsible: data.responsible.trim(),
      notes: normalizeString(data.notes),
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await syncBaseContentSchedule(data.contentType, data.contentId, handler, item.publishAt, authenticatedUserId);

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "EDITORIAL_CALENDAR_ITEM_CREATED",
      targetType: "EDITORIAL_CALENDAR_ITEM",
      targetId: item.id,
      context: {
        launchId: item.launchId,
        contentType: item.contentType,
        contentId: item.contentId,
        channel: item.channel,
        publishAt: item.publishAt,
        responsible: item.responsible
      }
    });

    return toPublicCalendarItem(item, publicContent);
  }

  async list(filters = {}) {
    const query = {
      active: true,
      publishAt: {}
    };

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.startAt) {
      query.publishAt.$gte = normalizeDate(filters.startAt);
    }

    if (filters.endAt) {
      query.publishAt.$lte = normalizeDate(filters.endAt);
    }

    if (!query.publishAt.$gte && !query.publishAt.$lte) {
      delete query.publishAt;
    }

    if (filters.channel) {
      query.channel = filters.channel.trim();
    }

    const items = await EditorialCalendarItem.find(query).sort({ publishAt: 1, channel: 1, createdAt: 1 });
    const enrichedItems = [];

    for (const item of items) {
      const { publicContent } = await resolveContentOrThrow(item.contentType, item.contentId);
      enrichedItems.push(toPublicCalendarItem(item, publicContent));
    }

    return {
      filters: {
        launchId: filters.launchId ?? null,
        startAt: filters.startAt ? normalizeDate(filters.startAt) : null,
        endAt: filters.endAt ? normalizeDate(filters.endAt) : null,
        channel: filters.channel ?? null
      },
      groups: groupCalendarItems(enrichedItems)
    };
  }

  async update(authenticatedUserId, itemId, data) {
    const item = await EditorialCalendarItem.findById(itemId);

    if (!item || !item.active) {
      throw {
        statusCode: 404,
        message: "Editorial calendar item not found"
      };
    }

    const { handler, publicContent } = await resolveContentOrThrow(item.contentType, item.contentId);
    const updates = {
      channel: data.channel?.trim() ?? item.channel,
      publishAt: data.publishAt ? normalizeDate(data.publishAt) : item.publishAt,
      responsible: data.responsible?.trim() ?? item.responsible,
      notes: data.notes !== undefined ? normalizeString(data.notes) : item.notes,
      updatedBy: authenticatedUserId
    };

    await EditorialCalendarItem.updateOne(
      { _id: itemId },
      {
        $set: updates
      }
    );

    await syncBaseContentSchedule(item.contentType, item.contentId, handler, updates.publishAt, authenticatedUserId);

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "EDITORIAL_CALENDAR_ITEM_UPDATED",
      targetType: "EDITORIAL_CALENDAR_ITEM",
      targetId: item.id,
      context: {
        launchId: item.launchId,
        previousChannel: item.channel,
        channel: updates.channel,
        previousPublishAt: item.publishAt,
        publishAt: updates.publishAt,
        previousResponsible: item.responsible,
        responsible: updates.responsible
      }
    });

    return toPublicCalendarItem(
      {
        ...item.toObject(),
        ...updates
      },
      publicContent
    );
  }
}

export const editorialCalendarService = new EditorialCalendarService();

import { publicationService } from "./publication.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function getDateKey(value) {
  return value.toISOString().slice(0, 10);
}

function getWeekStart(value) {
  const date = new Date(value);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  date.setUTCHours(0, 0, 0, 0);

  return date;
}

function mapVisualItem(publication) {
  return {
    id: publication.id,
    launchId: publication.launchId,
    channel: publication.channel,
    publishAt: publication.publishAt,
    status: publication.status,
    approvalStatus: publication.approvalStatus,
    responsible: publication.responsible,
    preview: publication.preview,
    metrics: publication.metrics,
    content: publication.content
  };
}

function buildEditorialCalendar(items) {
  const groups = new Map();

  for (const item of items) {
    const dateKey = getDateKey(item.publishAt);
    const current = groups.get(dateKey) ?? [];
    current.push(item);
    groups.set(dateKey, current);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, groupedItems]) => ({
      date,
      items: groupedItems.sort((left, right) => left.publishAt.getTime() - right.publishAt.getTime()).map(mapVisualItem)
    }));
}

function buildWeeklyGrid(items) {
  const groups = new Map();

  for (const item of items) {
    const weekStart = getWeekStart(item.publishAt);
    const weekKey = getDateKey(weekStart);
    const current = groups.get(weekKey) ?? new Map();
    const dayKey = getDateKey(item.publishAt);
    const dayItems = current.get(dayKey) ?? [];
    dayItems.push(item);
    current.set(dayKey, dayItems);
    groups.set(weekKey, current);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([weekStart, days]) => ({
      weekStart,
      days: [...days.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, dayItems]) => ({
          date,
          items: dayItems.sort((left, right) => left.publishAt.getTime() - right.publishAt.getTime()).map(mapVisualItem)
        }))
    }));
}

function buildStatusBuckets(items) {
  const buckets = {
    pending: [],
    scheduled: [],
    completed: []
  };

  for (const item of items) {
    if (item.status === "PUBLISHED") {
      buckets.completed.push(mapVisualItem(item));
      continue;
    }

    if (item.status === "SCHEDULED") {
      buckets.scheduled.push(mapVisualItem(item));
      continue;
    }

    buckets.pending.push(mapVisualItem(item));
  }

  return buckets;
}

class SocialMediaService {
  async list(filters = {}) {
    const publications = await publicationService.list(filters);
    const items = publications.filter((publication) => publication.publishAt).map((publication) => ({
      ...publication,
      publishAt: normalizeDate(publication.publishAt)
    }));
    const statusBuckets = buildStatusBuckets(items);

    return {
      filters: {
        launchId: filters.launchId ?? null,
        channel: filters.channel ?? null,
        startAt: filters.startAt ? normalizeDate(filters.startAt) : null,
        endAt: filters.endAt ? normalizeDate(filters.endAt) : null
      },
      summary: {
        pending: statusBuckets.pending.length,
        scheduled: statusBuckets.scheduled.length,
        completed: statusBuckets.completed.length,
        total: items.length
      },
      views: {
        editorialCalendar: buildEditorialCalendar(items),
        weeklyGrid: buildWeeklyGrid(items),
        visualFeed: [...items].sort((left, right) => right.publishAt.getTime() - left.publishAt.getTime()).map(mapVisualItem),
        statuses: statusBuckets
      }
    };
  }

  async schedulePublication(authenticatedUserId, data) {
    const existing = await publicationService.findByContent(data.contentType, data.contentId);
    const actionStatusMap = {
      SEND_TO_APPROVAL: "PLANNED",
      SCHEDULE: "SCHEDULED",
      PUBLISH: "PUBLISHED"
    };
    const nextStatus = actionStatusMap[data.action];
    const payload = {
      contentType: data.contentType,
      contentId: data.contentId,
      channel: data.channel,
      publishAt: data.publishAt,
      responsible: data.responsible,
      status: nextStatus,
      approvalRequestedAt: data.action === "SEND_TO_APPROVAL" ? new Date().toISOString() : undefined,
      preview: data.preview
    };

    const publication = existing
      ? await publicationService.update(authenticatedUserId, existing.id, payload)
      : await publicationService.create(authenticatedUserId, payload);

    return {
      action: data.action,
      publication
    };
  }

  async recordPerformance(authenticatedUserId, publicationId, data) {
    return publicationService.recordMetrics(authenticatedUserId, publicationId, data);
  }
}

export const socialMediaService = new SocialMediaService();

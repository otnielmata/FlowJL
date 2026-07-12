import { randomUUID } from "node:crypto";

import { Carousel } from "../models/carousel.model.js";
import { ContentApproval } from "../models/content-approval.model.js";
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
    statusField: "operationalStatus"
  },
  CAROUSEL: {
    model: Carousel,
    titleField: "theme",
    statusField: "operationalStatus"
  },
  STORY_SEQUENCE: {
    model: StorySequence,
    titleField: "theme",
    statusField: "operationalStatus"
  },
  EMAIL_CAMPAIGN: {
    model: EmailCampaign,
    titleField: "subject",
    statusField: "status"
  },
  YOUTUBE_CONTENT: {
    model: YouTubeContent,
    titleField: "theme",
    statusField: "operationalStatus"
  }
};

const checklistTemplates = {
  REEL: [
    "Roteiro revisado",
    "Legenda revisada",
    "Arquivo final validado",
    "Capa validada"
  ],
  CAROUSEL: [
    "Sequencia de cards revisada",
    "Copy dos cards revisada",
    "Design final validado",
    "Legenda revisada"
  ],
  STORY_SEQUENCE: [
    "Ordem dos stories validada",
    "CTAs revisados",
    "Criativos finais validados"
  ],
  EMAIL_CAMPAIGN: [
    "Assunto revisado",
    "Corpo do e-mail revisado",
    "Links testados",
    "Segmentacao conferida"
  ],
  YOUTUBE_CONTENT: [
    "Roteiro revisado",
    "Titulo e descricao revisados",
    "Thumbnail validada",
    "Arquivo final validado"
  ]
};

function normalizeStatus(value) {
  return value.trim().toUpperCase();
}

function normalizeNotes(value) {
  return value ? value.trim() : null;
}

function cloneItems(items) {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    required: item.required,
    completed: item.completed,
    completedBy: item.completedBy ?? null,
    completedAt: item.completedAt ?? null,
    notes: item.notes ?? null
  }));
}

function buildDefaultItems(contentType) {
  return checklistTemplates[contentType].map((label) => ({
    id: randomUUID(),
    label,
    required: true,
    completed: false,
    completedBy: null,
    completedAt: null,
    notes: null
  }));
}

function normalizeCreateItems(authenticatedUserId, contentType, items = []) {
  const sourceItems = items.length > 0 ? items : buildDefaultItems(contentType);
  const now = new Date();

  return sourceItems.map((item) => {
    const completed = item.completed ?? false;

    return {
      id: item.id ?? randomUUID(),
      label: item.label.trim(),
      required: item.required ?? true,
      completed,
      completedBy: completed ? authenticatedUserId : null,
      completedAt: completed ? now : null,
      notes: normalizeNotes(item.notes)
    };
  });
}

function resolveStatus(items, conclude = false) {
  const hasCompletedItem = items.some((item) => item.completed);
  const hasPendingRequiredItem = items.some((item) => item.required && !item.completed);

  if (conclude && hasPendingRequiredItem) {
    throw {
      statusCode: 409,
      message: "Required checklist items must be completed before final conclusion"
    };
  }

  if (!hasPendingRequiredItem && hasCompletedItem) {
    return "COMPLETED";
  }

  if (hasCompletedItem) {
    return "PARTIAL";
  }

  return "OPEN";
}

function createHistoryEntry({ action, fromStatus = null, toStatus, reason = null, actedBy, items }) {
  return {
    id: randomUUID(),
    action,
    fromStatus,
    toStatus,
    reason,
    actedBy,
    actedAt: new Date(),
    itemsSnapshot: cloneItems(items)
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

function toPublicChecklist(checklist, content = null) {
  return {
    id: checklist.id,
    launchId: checklist.launchId,
    contentType: checklist.contentType,
    contentId: checklist.contentId,
    status: checklist.status,
    items: cloneItems(checklist.items),
    history: checklist.history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      fromStatus: entry.fromStatus ?? null,
      toStatus: entry.toStatus,
      reason: entry.reason ?? null,
      actedBy: entry.actedBy,
      actedAt: entry.actedAt,
      itemsSnapshot: cloneItems(entry.itemsSnapshot ?? [])
    })),
    active: checklist.active,
    content,
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    createdBy: checklist.createdBy ?? null,
    updatedBy: checklist.updatedBy ?? null
  };
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
      message: "Production checklist requires content with launch context"
    };
  }

  return {
    handler,
    content
  };
}

async function ensureApprovedContent(contentType, contentId) {
  const approval = await ContentApproval.findOne({
    contentType,
    contentId,
    active: true
  });

  if (!approval || !["APPROVED", "PUBLISHED"].includes(approval.currentStatus)) {
    throw {
      statusCode: 409,
      message: "Content must be approved before production checklist execution"
    };
  }

  return approval;
}

function applyItemUpdates(authenticatedUserId, currentItems, itemUpdates) {
  const updatesById = new Map(itemUpdates.map((item) => [item.id, item]));
  const now = new Date();

  return currentItems.map((item) => {
    const update = updatesById.get(item.id);

    if (!update) {
      return item;
    }

    const nextCompleted = update.completed ?? item.completed;

    return {
      id: item.id,
      label: update.label?.trim() ?? item.label,
      required: update.required ?? item.required,
      completed: nextCompleted,
      completedBy: nextCompleted ? item.completedBy ?? authenticatedUserId : null,
      completedAt: nextCompleted ? item.completedAt ?? now : null,
      notes: update.notes !== undefined ? normalizeNotes(update.notes) : item.notes ?? null
    };
  });
}

function ensureAllUpdateItemsExist(currentItems, itemUpdates) {
  const currentIds = new Set(currentItems.map((item) => item.id));
  const missingItem = itemUpdates.find((item) => !currentIds.has(item.id));

  if (missingItem) {
    throw {
      statusCode: 404,
      message: "Checklist item not found"
    };
  }
}

class ProductionChecklistService {
  async create(authenticatedUserId, data) {
    const contentType = normalizeStatus(data.contentType);
    const { handler, content } = await resolveContentOrThrow(contentType, data.contentId);

    await ensureApprovedContent(contentType, data.contentId);

    const items = normalizeCreateItems(authenticatedUserId, contentType, data.items);
    const status = resolveStatus(items, data.conclude ?? false);
    const history = [
      createHistoryEntry({
        action: status === "COMPLETED" ? "COMPLETED" : "CREATED",
        toStatus: status,
        actedBy: authenticatedUserId,
        items
      })
    ];

    const checklist = await ProductionChecklist.create({
      launchId: content.launchId,
      contentType,
      contentId: data.contentId,
      status,
      items,
      history,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "PRODUCTION_CHECKLIST_CREATED",
      targetType: "PRODUCTION_CHECKLIST",
      targetId: checklist.id,
      context: {
        launchId: checklist.launchId,
        contentType: checklist.contentType,
        contentId: checklist.contentId,
        status: checklist.status
      }
    });

    return toPublicChecklist(checklist, toPublicContent(contentType, content, handler));
  }

  async list(filters = {}) {
    const query = {
      active: true
    };

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.contentType) {
      query.contentType = normalizeStatus(filters.contentType);
    }

    if (filters.contentId) {
      query.contentId = filters.contentId;
    }

    if (filters.status) {
      query.status = normalizeStatus(filters.status);
    }

    const checklists = await ProductionChecklist.find(query).sort({ updatedAt: -1, createdAt: -1 });
    const results = [];

    for (const checklist of checklists) {
      const { handler, content } = await resolveContentOrThrow(checklist.contentType, checklist.contentId);
      results.push(toPublicChecklist(checklist, toPublicContent(checklist.contentType, content, handler)));
    }

    return results;
  }

  async update(authenticatedUserId, checklistId, data) {
    const checklist = await ProductionChecklist.findById(checklistId);

    if (!checklist || !checklist.active) {
      throw {
        statusCode: 404,
        message: "Production checklist not found"
      };
    }

    const { handler, content } = await resolveContentOrThrow(checklist.contentType, checklist.contentId);
    const itemUpdates = data.items ?? [];

    ensureAllUpdateItemsExist(checklist.items, itemUpdates);

    const items = applyItemUpdates(authenticatedUserId, checklist.items, itemUpdates);
    const status = resolveStatus(items, data.conclude ?? false);
    const historyEntry = createHistoryEntry({
      action: status === "COMPLETED" ? "COMPLETED" : "UPDATED",
      fromStatus: checklist.status,
      toStatus: status,
      actedBy: authenticatedUserId,
      items
    });
    const updates = {
      status,
      items,
      history: [...checklist.history, historyEntry],
      updatedBy: authenticatedUserId
    };

    await ProductionChecklist.updateOne(
      { _id: checklistId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "PRODUCTION_CHECKLIST_UPDATED",
      targetType: "PRODUCTION_CHECKLIST",
      targetId: checklist.id,
      context: {
        launchId: checklist.launchId,
        contentType: checklist.contentType,
        contentId: checklist.contentId,
        previousStatus: checklist.status,
        status
      }
    });

    return toPublicChecklist(
      {
        ...checklist.toObject(),
        ...updates
      },
      toPublicContent(checklist.contentType, content, handler)
    );
  }

  async reopen(authenticatedUserId, checklistId, data) {
    const checklist = await ProductionChecklist.findById(checklistId);

    if (!checklist || !checklist.active) {
      throw {
        statusCode: 404,
        message: "Production checklist not found"
      };
    }

    if (checklist.status !== "COMPLETED") {
      throw {
        statusCode: 409,
        message: "Only completed production checklists can be reopened"
      };
    }

    const { handler, content } = await resolveContentOrThrow(checklist.contentType, checklist.contentId);
    const items = checklist.items.map((item) => ({
      id: item.id,
      label: item.label,
      required: item.required,
      completed: item.completed,
      completedBy: item.completedBy ?? null,
      completedAt: item.completedAt ?? null,
      notes: item.notes ?? null
    }));
    const historyEntry = createHistoryEntry({
      action: "REOPENED",
      fromStatus: checklist.status,
      toStatus: "REOPENED",
      reason: normalizeNotes(data.reason),
      actedBy: authenticatedUserId,
      items
    });
    const updates = {
      status: "REOPENED",
      history: [...checklist.history, historyEntry],
      updatedBy: authenticatedUserId
    };

    await ProductionChecklist.updateOne(
      { _id: checklistId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "PRODUCTION_CHECKLIST_REOPENED",
      targetType: "PRODUCTION_CHECKLIST",
      targetId: checklist.id,
      context: {
        launchId: checklist.launchId,
        contentType: checklist.contentType,
        contentId: checklist.contentId,
        reason: updates.history.at(-1).reason
      }
    });

    return toPublicChecklist(
      {
        ...checklist.toObject(),
        ...updates
      },
      toPublicContent(checklist.contentType, content, handler)
    );
  }
}

export const productionChecklistService = new ProductionChecklistService();

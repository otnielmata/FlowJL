import { randomUUID } from "node:crypto";

import { ClassSchedule } from "../models/class-schedule.model.js";
import { DiscordOperation } from "../models/discord-operation.model.js";
import { Launch } from "../models/launch.model.js";
import { LiveEvent } from "../models/live-event.model.js";
import { OperationalChecklist } from "../models/operational-checklist.model.js";
import { OperationalEmail } from "../models/operational-email.model.js";
import { Student } from "../models/student.model.js";
import { SupportTicket } from "../models/support-ticket.model.js";
import { auditService } from "./audit.service.js";

const contextModels = {
  LAUNCH: Launch,
  CLASS_SCHEDULE: ClassSchedule,
  LIVE_EVENT: LiveEvent,
  DISCORD_OPERATION: DiscordOperation,
  OPERATIONAL_EMAIL: OperationalEmail,
  STUDENT: Student,
  SUPPORT_TICKET: SupportTicket
};

const checklistTemplates = {
  LAUNCH: ["Contexto revisado", "Responsaveis alinhados", "Proximas acoes definidas"],
  CLASS_SCHEDULE: ["Tema confirmado", "Material preparado", "Comunicacao enviada"],
  LIVE_EVENT: ["Link validado", "Roteiro revisado", "Equipe de apoio acionada"],
  DISCORD_OPERATION: ["Atividade conferida", "Mensagem revisada", "Execucao confirmada"],
  OPERATIONAL_EMAIL: ["Segmentacao conferida", "Links testados", "Disparo validado"],
  STUDENT: ["Dados conferidos", "Produto vinculado", "Pendencias registradas"],
  SUPPORT_TICKET: ["Solicitacao entendida", "Responsavel acionado", "Retorno registrado"]
};

function normalizeNotes(value) {
  return value ? value.trim() : null;
}

function cloneItems(items = []) {
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

function buildDefaultItems(operationType) {
  return checklistTemplates[operationType].map((label) => ({
    id: randomUUID(),
    label,
    required: true,
    completed: false,
    completedBy: null,
    completedAt: null,
    notes: null
  }));
}

function normalizeCreateItems(authenticatedUserId, operationType, items = []) {
  const sourceItems = items.length > 0 ? items : buildDefaultItems(operationType);
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
      message: "Required operational checklist items must be completed before conclusion"
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

function createHistoryEntry({ action, fromStatus = null, toStatus, actedBy, items, reason = null }) {
  return {
    id: randomUUID(),
    action,
    fromStatus,
    toStatus,
    actedBy,
    actedAt: new Date(),
    reason,
    itemsSnapshot: cloneItems(items)
  };
}

function applyItemUpdates(authenticatedUserId, currentItems, itemUpdates = []) {
  const updatesById = new Map(itemUpdates.map((item) => [item.id, item]));
  const now = new Date();

  return currentItems.map((item) => {
    const update = updatesById.get(item.id);

    if (!update) {
      return item;
    }

    const completed = update.completed ?? item.completed;

    return {
      id: item.id,
      label: update.label?.trim() ?? item.label,
      required: update.required ?? item.required,
      completed,
      completedBy: completed ? item.completedBy ?? authenticatedUserId : null,
      completedAt: completed ? item.completedAt ?? now : null,
      notes: update.notes !== undefined ? normalizeNotes(update.notes) : item.notes ?? null
    };
  });
}

function toPublicOperationalChecklist(checklist) {
  return {
    id: checklist.id,
    operationType: checklist.operationType,
    contextId: checklist.contextId,
    title: checklist.title,
    status: checklist.status,
    items: cloneItems(checklist.items),
    history: (checklist.history ?? []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      fromStatus: entry.fromStatus ?? null,
      toStatus: entry.toStatus,
      actedBy: entry.actedBy,
      actedAt: entry.actedAt,
      reason: entry.reason ?? null,
      itemsSnapshot: cloneItems(entry.itemsSnapshot ?? [])
    })),
    completedAt: checklist.completedAt ?? null,
    active: checklist.active,
    deactivatedAt: checklist.deactivatedAt ?? null,
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    createdBy: checklist.createdBy ?? null,
    updatedBy: checklist.updatedBy ?? null
  };
}

async function ensureOperationalContext(operationType, contextId) {
  const model = contextModels[operationType];

  if (!model) {
    throw {
      statusCode: 400,
      message: "Unsupported operational checklist type"
    };
  }

  const context = await model.findById(contextId);

  if (!context || context.active === false) {
    throw {
      statusCode: 404,
      message: "Operational context not found"
    };
  }

  return context;
}

class OperationalChecklistService {
  async create(authenticatedUserId, data) {
    await ensureOperationalContext(data.operationType, data.contextId);

    const items = normalizeCreateItems(authenticatedUserId, data.operationType, data.items);
    const status = resolveStatus(items, data.conclude);
    const completedAt = status === "COMPLETED" ? new Date() : null;
    const checklist = await OperationalChecklist.create({
      operationType: data.operationType,
      contextId: data.contextId,
      title: data.title.trim(),
      status,
      items,
      history: [
        createHistoryEntry({
          action: status === "COMPLETED" ? "COMPLETED" : "CREATED",
          toStatus: status,
          actedBy: authenticatedUserId,
          items
        })
      ],
      completedAt,
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OPERATIONAL_CHECKLIST_CREATED",
      targetType: "OPERATIONAL_CHECKLIST",
      targetId: checklist.id,
      context: {
        operationType: checklist.operationType,
        contextId: checklist.contextId,
        status: checklist.status,
        completedAt: checklist.completedAt ?? null
      }
    });

    return toPublicOperationalChecklist(checklist);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.operationType) {
      query.operationType = filters.operationType;
    }

    if (filters.contextId) {
      query.contextId = filters.contextId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    } else {
      query.active = true;
    }

    const checklists = await OperationalChecklist.find(query).sort({ createdAt: -1 });
    return checklists.map((checklist) => toPublicOperationalChecklist(checklist));
  }

  async getById(checklistId) {
    const checklist = await OperationalChecklist.findById(checklistId);

    if (!checklist) {
      throw {
        statusCode: 404,
        message: "Operational checklist not found"
      };
    }

    return toPublicOperationalChecklist(checklist);
  }

  async update(authenticatedUserId, checklistId, data) {
    const checklist = await OperationalChecklist.findById(checklistId);

    if (!checklist || !checklist.active) {
      throw {
        statusCode: 404,
        message: "Operational checklist not found"
      };
    }

    if (checklist.status === "COMPLETED" && !data.conclude) {
      throw {
        statusCode: 409,
        message: "Completed operational checklist cannot be updated"
      };
    }

    const items = applyItemUpdates(authenticatedUserId, checklist.items, data.items);
    const status = resolveStatus(items, data.conclude);
    const completedAt = status === "COMPLETED" ? checklist.completedAt ?? new Date() : null;
    const historyEntry = createHistoryEntry({
      action: status === "COMPLETED" ? "COMPLETED" : "UPDATED",
      fromStatus: checklist.status,
      toStatus: status,
      actedBy: authenticatedUserId,
      items
    });
    const updates = {
      title: data.title?.trim() ?? checklist.title,
      status,
      items,
      completedAt,
      updatedBy: authenticatedUserId
    };

    await OperationalChecklist.updateOne(
      { _id: checklistId },
      {
        $set: updates,
        $push: {
          history: historyEntry
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OPERATIONAL_CHECKLIST_UPDATED",
      targetType: "OPERATIONAL_CHECKLIST",
      targetId: checklist.id,
      context: {
        operationType: checklist.operationType,
        contextId: checklist.contextId,
        previousStatus: checklist.status,
        status,
        completedAt
      }
    });

    return toPublicOperationalChecklist({
      ...checklist.toObject(),
      ...updates,
      id: checklist.id,
      history: [...(checklist.history ?? []), historyEntry],
      updatedAt: new Date()
    });
  }

  async complete(authenticatedUserId, checklistId) {
    return this.update(authenticatedUserId, checklistId, { conclude: true });
  }

  async deactivate(authenticatedUserId, checklistId) {
    const checklist = await OperationalChecklist.findById(checklistId);

    if (!checklist) {
      throw {
        statusCode: 404,
        message: "Operational checklist not found"
      };
    }

    if (!checklist.active) {
      throw {
        statusCode: 409,
        message: "Operational checklist is already inactive"
      };
    }

    const deactivatedAt = new Date();
    const historyEntry = createHistoryEntry({
      action: "DEACTIVATED",
      fromStatus: checklist.status,
      toStatus: checklist.status,
      actedBy: authenticatedUserId,
      reason: "Logical deletion",
      items: checklist.items
    });

    await OperationalChecklist.updateOne(
      { _id: checklistId },
      {
        $set: {
          active: false,
          deactivatedAt,
          updatedBy: authenticatedUserId
        },
        $push: {
          history: historyEntry
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OPERATIONAL_CHECKLIST_DEACTIVATED",
      targetType: "OPERATIONAL_CHECKLIST",
      targetId: checklist.id,
      context: {
        operationType: checklist.operationType,
        contextId: checklist.contextId,
        status: checklist.status
      }
    });

    return toPublicOperationalChecklist({
      ...checklist.toObject(),
      id: checklist.id,
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId,
      history: [...(checklist.history ?? []), historyEntry]
    });
  }
}

export const operationalChecklistService = new OperationalChecklistService();
export { toPublicOperationalChecklist };

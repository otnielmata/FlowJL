import { DiscordOperation } from "../models/discord-operation.model.js";
import { Launch } from "../models/launch.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeString(value) {
  return value?.trim() ?? null;
}

function toPublicDiscordOperation(operation) {
  return {
    id: operation.id,
    launchId: operation.launchId,
    type: operation.type,
    activity: operation.activity,
    responsible: operation.responsible,
    dueAt: operation.dueAt,
    status: operation.status,
    observations: operation.observations ?? null,
    active: operation.active,
    deactivatedAt: operation.deactivatedAt ?? null,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
    createdBy: operation.createdBy ?? null,
    updatedBy: operation.updatedBy ?? null
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
}

class DiscordOperationService {
  async create(authenticatedUserId, data) {
    await ensureLaunchExists(data.launchId);

    const operation = await DiscordOperation.create({
      launchId: data.launchId,
      type: data.type.trim(),
      activity: data.activity.trim(),
      responsible: data.responsible.trim(),
      dueAt: normalizeDate(data.dueAt),
      status: data.status,
      observations: normalizeString(data.observations),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "DISCORD_OPERATION_CREATED",
      targetType: "DISCORD_OPERATION",
      targetId: operation.id,
      context: {
        launchId: operation.launchId,
        type: operation.type,
        dueAt: operation.dueAt,
        responsible: operation.responsible,
        status: operation.status
      }
    });

    return toPublicDiscordOperation(operation);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.type) {
      query.type = filters.type.trim();
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.responsible) {
      query.responsible = filters.responsible.trim();
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    } else {
      query.active = true;
    }

    if (filters.startAt || filters.endAt) {
      query.dueAt = {};

      if (filters.startAt) {
        query.dueAt.$gte = normalizeDate(filters.startAt);
      }

      if (filters.endAt) {
        query.dueAt.$lte = normalizeDate(filters.endAt);
      }
    }

    const operations = await DiscordOperation.find(query).sort({ dueAt: 1, activity: 1 });
    return operations.map((operation) => toPublicDiscordOperation(operation));
  }

  async update(authenticatedUserId, operationId, data) {
    const operation = await DiscordOperation.findById(operationId);

    if (!operation || !operation.active) {
      throw {
        statusCode: 404,
        message: "Discord operation not found"
      };
    }

    const updates = {
      type: data.type?.trim() ?? operation.type,
      activity: data.activity?.trim() ?? operation.activity,
      responsible: data.responsible?.trim() ?? operation.responsible,
      dueAt: data.dueAt ? normalizeDate(data.dueAt) : operation.dueAt,
      status: data.status ?? operation.status,
      observations: data.observations !== undefined ? normalizeString(data.observations) : operation.observations,
      updatedBy: authenticatedUserId
    };

    await DiscordOperation.updateOne(
      { _id: operationId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "DISCORD_OPERATION_UPDATED",
      targetType: "DISCORD_OPERATION",
      targetId: operation.id,
      context: {
        launchId: operation.launchId,
        previousStatus: operation.status,
        status: updates.status,
        previousResponsible: operation.responsible,
        responsible: updates.responsible,
        previousDueAt: operation.dueAt,
        dueAt: updates.dueAt,
        observationsChanged: data.observations !== undefined
      }
    });

    return toPublicDiscordOperation({
      ...operation.toObject(),
      ...updates,
      id: operation.id,
      updatedAt: new Date()
    });
  }

  async deactivate(authenticatedUserId, operationId) {
    const operation = await DiscordOperation.findById(operationId);

    if (!operation) {
      throw {
        statusCode: 404,
        message: "Discord operation not found"
      };
    }

    if (!operation.active) {
      throw {
        statusCode: 409,
        message: "Discord operation is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await DiscordOperation.updateOne(
      { _id: operationId },
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
      action: "DISCORD_OPERATION_DEACTIVATED",
      targetType: "DISCORD_OPERATION",
      targetId: operation.id,
      context: {
        launchId: operation.launchId,
        type: operation.type,
        dueAt: operation.dueAt,
        responsible: operation.responsible,
        status: operation.status
      }
    });

    return toPublicDiscordOperation({
      ...operation.toObject(),
      id: operation.id,
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    });
  }
}

export const discordOperationService = new DiscordOperationService();
export { toPublicDiscordOperation };

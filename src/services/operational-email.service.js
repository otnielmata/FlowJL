import { Launch } from "../models/launch.model.js";
import { OperationalEmail } from "../models/operational-email.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeString(value) {
  return value?.trim() ?? null;
}

function toPublicOperationalEmail(emailAction) {
  return {
    id: emailAction.id,
    launchId: emailAction.launchId,
    objective: emailAction.objective,
    responsible: emailAction.responsible,
    dueAt: emailAction.dueAt,
    status: emailAction.status,
    audience: emailAction.audience ?? null,
    subject: emailAction.subject ?? null,
    observations: emailAction.observations ?? null,
    active: emailAction.active,
    deactivatedAt: emailAction.deactivatedAt ?? null,
    createdAt: emailAction.createdAt,
    updatedAt: emailAction.updatedAt,
    createdBy: emailAction.createdBy ?? null,
    updatedBy: emailAction.updatedBy ?? null
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

class OperationalEmailService {
  async create(authenticatedUserId, data) {
    await ensureLaunchExists(data.launchId);

    const emailAction = await OperationalEmail.create({
      launchId: data.launchId,
      objective: data.objective.trim(),
      responsible: data.responsible.trim(),
      dueAt: normalizeDate(data.dueAt),
      status: data.status,
      audience: normalizeString(data.audience),
      subject: normalizeString(data.subject),
      observations: normalizeString(data.observations),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OPERATIONAL_EMAIL_CREATED",
      targetType: "OPERATIONAL_EMAIL",
      targetId: emailAction.id,
      context: {
        launchId: emailAction.launchId,
        dueAt: emailAction.dueAt,
        responsible: emailAction.responsible,
        status: emailAction.status,
        objective: emailAction.objective
      }
    });

    return toPublicOperationalEmail(emailAction);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
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

    const emailActions = await OperationalEmail.find(query).sort({ dueAt: 1, objective: 1 });
    return emailActions.map((emailAction) => toPublicOperationalEmail(emailAction));
  }

  async update(authenticatedUserId, emailActionId, data) {
    const emailAction = await OperationalEmail.findById(emailActionId);

    if (!emailAction || !emailAction.active) {
      throw {
        statusCode: 404,
        message: "Operational email action not found"
      };
    }

    const updates = {
      objective: data.objective?.trim() ?? emailAction.objective,
      responsible: data.responsible?.trim() ?? emailAction.responsible,
      dueAt: data.dueAt ? normalizeDate(data.dueAt) : emailAction.dueAt,
      status: data.status ?? emailAction.status,
      audience: data.audience !== undefined ? normalizeString(data.audience) : emailAction.audience,
      subject: data.subject !== undefined ? normalizeString(data.subject) : emailAction.subject,
      observations: data.observations !== undefined ? normalizeString(data.observations) : emailAction.observations,
      updatedBy: authenticatedUserId
    };

    await OperationalEmail.updateOne(
      { _id: emailActionId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OPERATIONAL_EMAIL_UPDATED",
      targetType: "OPERATIONAL_EMAIL",
      targetId: emailAction.id,
      context: {
        launchId: emailAction.launchId,
        previousStatus: emailAction.status,
        status: updates.status,
        previousDueAt: emailAction.dueAt,
        dueAt: updates.dueAt,
        previousResponsible: emailAction.responsible,
        responsible: updates.responsible,
        observationsChanged: data.observations !== undefined
      }
    });

    return toPublicOperationalEmail({
      ...emailAction.toObject(),
      ...updates,
      id: emailAction.id,
      updatedAt: new Date()
    });
  }

  async deactivate(authenticatedUserId, emailActionId) {
    const emailAction = await OperationalEmail.findById(emailActionId);

    if (!emailAction) {
      throw {
        statusCode: 404,
        message: "Operational email action not found"
      };
    }

    if (!emailAction.active) {
      throw {
        statusCode: 409,
        message: "Operational email action is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await OperationalEmail.updateOne(
      { _id: emailActionId },
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
      action: "OPERATIONAL_EMAIL_DEACTIVATED",
      targetType: "OPERATIONAL_EMAIL",
      targetId: emailAction.id,
      context: {
        launchId: emailAction.launchId,
        dueAt: emailAction.dueAt,
        responsible: emailAction.responsible,
        status: emailAction.status
      }
    });

    return toPublicOperationalEmail({
      ...emailAction.toObject(),
      id: emailAction.id,
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    });
  }
}

export const operationalEmailService = new OperationalEmailService();
export { toPublicOperationalEmail };

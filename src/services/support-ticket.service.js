import { Launch } from "../models/launch.model.js";
import { Student } from "../models/student.model.js";
import { SupportTicket } from "../models/support-ticket.model.js";
import { auditService } from "./audit.service.js";

const closedStatuses = new Set(["RESOLVED", "CLOSED"]);

function normalizeString(value) {
  return value?.trim() ?? null;
}

function isClosedStatus(status) {
  return closedStatuses.has(status);
}

function normalizeInteraction(interaction, actorUserId) {
  if (!interaction) {
    return null;
  }

  return {
    occurredAt: new Date(),
    actorUserId,
    type: interaction.type.trim(),
    note: interaction.note.trim()
  };
}

function toPublicSupportTicket(ticket) {
  return {
    id: ticket.id,
    launchId: ticket.launchId ?? null,
    studentId: ticket.studentId ?? null,
    requester: ticket.requester,
    demandType: ticket.demandType,
    responsibleUserId: ticket.responsibleUserId,
    status: ticket.status,
    priority: ticket.priority,
    observations: ticket.observations ?? null,
    interactionHistory: [...(ticket.interactionHistory ?? [])],
    closedAt: ticket.closedAt ?? null,
    active: ticket.active,
    deactivatedAt: ticket.deactivatedAt ?? null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    createdBy: ticket.createdBy ?? null,
    updatedBy: ticket.updatedBy ?? null
  };
}

async function ensureLaunchExists(launchId) {
  if (!launchId) {
    return;
  }

  const launch = await Launch.findById(launchId);

  if (!launch || launch.active === false) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }
}

async function ensureStudentExists(studentId) {
  if (!studentId) {
    return;
  }

  const student = await Student.findById(studentId);

  if (!student || student.active === false) {
    throw {
      statusCode: 404,
      message: "Student not found"
    };
  }
}

async function ensureOperationalContext({ launchId, studentId }) {
  if (!launchId && !studentId) {
    throw {
      statusCode: 400,
      message: "A valid launch or student context must be informed"
    };
  }

  await Promise.all([ensureLaunchExists(launchId), ensureStudentExists(studentId)]);
}

class SupportTicketService {
  async create(authenticatedUserId, data) {
    const launchId = data.launchId ?? null;
    const studentId = data.studentId ?? null;
    await ensureOperationalContext({ launchId, studentId });

    const initialInteraction = normalizeInteraction(data.initialInteraction, authenticatedUserId);
    const closedAt = isClosedStatus(data.status) ? new Date() : null;
    const ticket = await SupportTicket.create({
      launchId,
      studentId,
      requester: data.requester.trim(),
      demandType: data.demandType.trim(),
      responsibleUserId: data.responsibleUserId.trim(),
      status: data.status,
      priority: data.priority ?? "MEDIUM",
      observations: normalizeString(data.observations),
      interactionHistory: initialInteraction ? [initialInteraction] : [],
      closedAt,
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "SUPPORT_TICKET_CREATED",
      targetType: "SUPPORT_TICKET",
      targetId: ticket.id,
      context: {
        launchId: ticket.launchId ?? null,
        studentId: ticket.studentId ?? null,
        status: ticket.status,
        priority: ticket.priority,
        responsibleUserId: ticket.responsibleUserId
      }
    });

    return toPublicSupportTicket(ticket);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.studentId) {
      query.studentId = filters.studentId;
    }

    if (filters.responsibleUserId) {
      query.responsibleUserId = filters.responsibleUserId.trim();
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    } else {
      query.active = true;
    }

    const tickets = await SupportTicket.find(query).sort({ createdAt: -1 });
    return tickets.map((ticket) => toPublicSupportTicket(ticket));
  }

  async getById(ticketId) {
    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
      throw {
        statusCode: 404,
        message: "Support ticket not found"
      };
    }

    return toPublicSupportTicket(ticket);
  }

  async update(authenticatedUserId, ticketId, data) {
    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket || !ticket.active) {
      throw {
        statusCode: 404,
        message: "Support ticket not found"
      };
    }

    const launchId = data.launchId !== undefined ? data.launchId : ticket.launchId ?? null;
    const studentId = data.studentId !== undefined ? data.studentId : ticket.studentId ?? null;
    await ensureOperationalContext({ launchId, studentId });

    const status = data.status ?? ticket.status;
    const interaction = normalizeInteraction(data.interaction, authenticatedUserId);
    const shouldClose = isClosedStatus(status) && !ticket.closedAt;
    const shouldReopen = !isClosedStatus(status);
    const updates = {
      launchId,
      studentId,
      requester: data.requester?.trim() ?? ticket.requester,
      demandType: data.demandType?.trim() ?? ticket.demandType,
      responsibleUserId: data.responsibleUserId?.trim() ?? ticket.responsibleUserId,
      status,
      priority: data.priority ?? ticket.priority,
      observations: data.observations !== undefined ? normalizeString(data.observations) : ticket.observations,
      closedAt: shouldClose ? new Date() : shouldReopen ? null : ticket.closedAt,
      updatedBy: authenticatedUserId
    };

    const updateOperation = {
      $set: updates
    };

    if (interaction) {
      updateOperation.$push = {
        interactionHistory: interaction
      };
    }

    await SupportTicket.updateOne({ _id: ticketId }, updateOperation);

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "SUPPORT_TICKET_UPDATED",
      targetType: "SUPPORT_TICKET",
      targetId: ticket.id,
      context: {
        launchId: updates.launchId ?? null,
        studentId: updates.studentId ?? null,
        previousStatus: ticket.status,
        status: updates.status,
        previousPriority: ticket.priority,
        priority: updates.priority
      }
    });

    return toPublicSupportTicket({
      ...ticket.toObject(),
      ...updates,
      id: ticket.id,
      interactionHistory: interaction ? [...(ticket.interactionHistory ?? []), interaction] : ticket.interactionHistory,
      updatedAt: new Date()
    });
  }

  async close(authenticatedUserId, ticketId, data = {}) {
    return this.update(authenticatedUserId, ticketId, {
      status: data.status ?? "RESOLVED",
      observations: data.observations,
      interaction: data.interaction ?? {
        type: "CLOSURE",
        note: data.note ?? "Atendimento encerrado."
      }
    });
  }

  async deactivate(authenticatedUserId, ticketId) {
    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
      throw {
        statusCode: 404,
        message: "Support ticket not found"
      };
    }

    if (!ticket.active) {
      throw {
        statusCode: 409,
        message: "Support ticket is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await SupportTicket.updateOne(
      { _id: ticketId },
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
      action: "SUPPORT_TICKET_DEACTIVATED",
      targetType: "SUPPORT_TICKET",
      targetId: ticket.id,
      context: {
        launchId: ticket.launchId ?? null,
        studentId: ticket.studentId ?? null,
        status: ticket.status
      }
    });

    return toPublicSupportTicket({
      ...ticket.toObject(),
      id: ticket.id,
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    });
  }
}

export const supportTicketService = new SupportTicketService();
export { toPublicSupportTicket };

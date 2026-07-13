import { z } from "zod";

import { supportTicketPriorities, supportTicketStatuses } from "../models/support-ticket.model.js";
import { supportTicketService } from "../services/support-ticket.service.js";

const statusSchema = z.enum(supportTicketStatuses);
const prioritySchema = z.enum(supportTicketPriorities);

const interactionSchema = z.object({
  type: z.string().trim().min(2).max(80),
  note: z.string().trim().min(2).max(2000)
});

const createSupportTicketSchema = z.object({
  launchId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  requester: z.string().trim().min(2).max(160),
  demandType: z.string().trim().min(2).max(120),
  responsibleUserId: z.string().trim().min(2).max(160),
  status: statusSchema,
  priority: prioritySchema.optional().default("MEDIUM"),
  observations: z.string().trim().max(2000).optional(),
  initialInteraction: interactionSchema.optional()
});

const listSupportTicketSchema = z.object({
  launchId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  responsibleUserId: z.string().trim().min(2).max(160).optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const updateSupportTicketSchema = z
  .object({
    launchId: z.string().uuid().nullable().optional(),
    studentId: z.string().uuid().nullable().optional(),
    requester: z.string().trim().min(2).max(160).optional(),
    demandType: z.string().trim().min(2).max(120).optional(),
    responsibleUserId: z.string().trim().min(2).max(160).optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    observations: z.string().trim().max(2000).nullable().optional(),
    interaction: interactionSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const closeSupportTicketSchema = z.object({
  status: z.enum(["RESOLVED", "CLOSED"]).optional(),
  observations: z.string().trim().max(2000).nullable().optional(),
  note: z.string().trim().min(2).max(2000).optional(),
  interaction: interactionSchema.optional()
});

const paramsSchema = z.object({
  ticketId: z.string().uuid()
});

class SupportTicketController {
  async create(request, response) {
    const payload = createSupportTicketSchema.parse(request.body);
    const ticket = await supportTicketService.create(request.auth.sub, payload);

    response.status(201).json(ticket);
  }

  async list(request, response) {
    const filters = listSupportTicketSchema.parse(request.query);
    const tickets = await supportTicketService.list(filters);

    response.status(200).json(tickets);
  }

  async getById(request, response) {
    const { ticketId } = paramsSchema.parse(request.params);
    const ticket = await supportTicketService.getById(ticketId);

    response.status(200).json(ticket);
  }

  async update(request, response) {
    const { ticketId } = paramsSchema.parse(request.params);
    const payload = updateSupportTicketSchema.parse(request.body);
    const ticket = await supportTicketService.update(request.auth.sub, ticketId, payload);

    response.status(200).json(ticket);
  }

  async close(request, response) {
    const { ticketId } = paramsSchema.parse(request.params);
    const payload = closeSupportTicketSchema.parse(request.body);
    const ticket = await supportTicketService.close(request.auth.sub, ticketId, payload);

    response.status(200).json(ticket);
  }

  async deactivate(request, response) {
    const { ticketId } = paramsSchema.parse(request.params);
    const ticket = await supportTicketService.deactivate(request.auth.sub, ticketId);

    response.status(200).json(ticket);
  }
}

export const supportTicketController = new SupportTicketController();

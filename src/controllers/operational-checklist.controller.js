import { z } from "zod";

import { operationalChecklistOperationTypes, operationalChecklistStatuses } from "../models/operational-checklist.model.js";
import { operationalChecklistService } from "../services/operational-checklist.service.js";

const operationTypeSchema = z.enum(operationalChecklistOperationTypes);
const statusSchema = z.enum(operationalChecklistStatuses);

const createChecklistItemSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(3).max(160),
  required: z.boolean().optional(),
  completed: z.boolean().optional(),
  notes: z.string().trim().min(3).max(500).optional()
});

const updateChecklistItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(3).max(160).optional(),
  required: z.boolean().optional(),
  completed: z.boolean().optional(),
  notes: z.string().trim().min(3).max(500).nullable().optional()
});

const createOperationalChecklistSchema = z.object({
  operationType: operationTypeSchema,
  contextId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  items: z.array(createChecklistItemSchema).min(1).optional(),
  conclude: z.boolean().optional()
});

const listOperationalChecklistSchema = z.object({
  operationType: operationTypeSchema.optional(),
  contextId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const updateOperationalChecklistSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    items: z.array(updateChecklistItemSchema).min(1).optional(),
    conclude: z.boolean().optional()
  })
  .refine((value) => value.title || value.items || value.conclude !== undefined, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  checklistId: z.string().uuid()
});

class OperationalChecklistController {
  async create(request, response) {
    const payload = createOperationalChecklistSchema.parse(request.body);
    const checklist = await operationalChecklistService.create(request.auth.sub, payload);

    response.status(201).json(checklist);
  }

  async list(request, response) {
    const filters = listOperationalChecklistSchema.parse(request.query);
    const checklists = await operationalChecklistService.list(filters);

    response.status(200).json(checklists);
  }

  async getById(request, response) {
    const { checklistId } = paramsSchema.parse(request.params);
    const checklist = await operationalChecklistService.getById(checklistId);

    response.status(200).json(checklist);
  }

  async update(request, response) {
    const { checklistId } = paramsSchema.parse(request.params);
    const payload = updateOperationalChecklistSchema.parse(request.body);
    const checklist = await operationalChecklistService.update(request.auth.sub, checklistId, payload);

    response.status(200).json(checklist);
  }

  async complete(request, response) {
    const { checklistId } = paramsSchema.parse(request.params);
    const checklist = await operationalChecklistService.complete(request.auth.sub, checklistId);

    response.status(200).json(checklist);
  }

  async deactivate(request, response) {
    const { checklistId } = paramsSchema.parse(request.params);
    const checklist = await operationalChecklistService.deactivate(request.auth.sub, checklistId);

    response.status(200).json(checklist);
  }
}

export const operationalChecklistController = new OperationalChecklistController();

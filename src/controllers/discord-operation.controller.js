import { z } from "zod";

import { discordOperationStatuses } from "../models/discord-operation.model.js";
import { discordOperationService } from "../services/discord-operation.service.js";

const statusSchema = z.enum(discordOperationStatuses);

const createDiscordOperationSchema = z.object({
  launchId: z.string().uuid(),
  type: z.string().trim().min(2).max(120),
  activity: z.string().trim().min(3).max(240),
  responsible: z.string().trim().min(2).max(120),
  dueAt: z.string().datetime(),
  status: statusSchema,
  observations: z.string().trim().max(1000).optional()
});

const listDiscordOperationSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    type: z.string().trim().min(2).max(120).optional(),
    status: statusSchema.optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
  })
  .superRefine((value, context) => {
    if (value.startAt && value.endAt && new Date(value.startAt).getTime() > new Date(value.endAt).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startAt must be before or equal to endAt",
        path: ["startAt"]
      });
    }
  });

const updateDiscordOperationSchema = z
  .object({
    type: z.string().trim().min(2).max(120).optional(),
    activity: z.string().trim().min(3).max(240).optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    dueAt: z.string().datetime().optional(),
    status: statusSchema.optional(),
    observations: z.string().trim().max(1000).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  operationId: z.string().uuid()
});

class DiscordOperationController {
  async create(request, response) {
    const payload = createDiscordOperationSchema.parse(request.body);
    const operation = await discordOperationService.create(request.auth.sub, payload);

    response.status(201).json(operation);
  }

  async list(request, response) {
    const filters = listDiscordOperationSchema.parse(request.query);
    const operations = await discordOperationService.list(filters);

    response.status(200).json(operations);
  }

  async update(request, response) {
    const { operationId } = paramsSchema.parse(request.params);
    const payload = updateDiscordOperationSchema.parse(request.body);
    const operation = await discordOperationService.update(request.auth.sub, operationId, payload);

    response.status(200).json(operation);
  }

  async deactivate(request, response) {
    const { operationId } = paramsSchema.parse(request.params);
    const operation = await discordOperationService.deactivate(request.auth.sub, operationId);

    response.status(200).json(operation);
  }
}

export const discordOperationController = new DiscordOperationController();

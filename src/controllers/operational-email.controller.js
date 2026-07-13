import { z } from "zod";

import { operationalEmailStatuses } from "../models/operational-email.model.js";
import { operationalEmailService } from "../services/operational-email.service.js";

const statusSchema = z.enum(operationalEmailStatuses);

const createOperationalEmailSchema = z.object({
  launchId: z.string().uuid(),
  objective: z.string().trim().min(3).max(240),
  responsible: z.string().trim().min(2).max(120),
  dueAt: z.string().datetime(),
  status: statusSchema,
  audience: z.string().trim().max(180).optional(),
  subject: z.string().trim().max(180).optional(),
  observations: z.string().trim().max(1000).optional()
});

const listOperationalEmailSchema = z
  .object({
    launchId: z.string().uuid().optional(),
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

const updateOperationalEmailSchema = z
  .object({
    objective: z.string().trim().min(3).max(240).optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    dueAt: z.string().datetime().optional(),
    status: statusSchema.optional(),
    audience: z.string().trim().max(180).nullable().optional(),
    subject: z.string().trim().max(180).nullable().optional(),
    observations: z.string().trim().max(1000).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  emailActionId: z.string().uuid()
});

class OperationalEmailController {
  async create(request, response) {
    const payload = createOperationalEmailSchema.parse(request.body);
    const emailAction = await operationalEmailService.create(request.auth.sub, payload);

    response.status(201).json(emailAction);
  }

  async list(request, response) {
    const filters = listOperationalEmailSchema.parse(request.query);
    const emailActions = await operationalEmailService.list(filters);

    response.status(200).json(emailActions);
  }

  async update(request, response) {
    const { emailActionId } = paramsSchema.parse(request.params);
    const payload = updateOperationalEmailSchema.parse(request.body);
    const emailAction = await operationalEmailService.update(request.auth.sub, emailActionId, payload);

    response.status(200).json(emailAction);
  }

  async deactivate(request, response) {
    const { emailActionId } = paramsSchema.parse(request.params);
    const emailAction = await operationalEmailService.deactivate(request.auth.sub, emailActionId);

    response.status(200).json(emailAction);
  }
}

export const operationalEmailController = new OperationalEmailController();

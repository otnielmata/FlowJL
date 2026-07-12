import { z } from "zod";

import { liveEventStatuses } from "../models/live-event.model.js";
import { liveEventService } from "../services/live-event.service.js";

const statusSchema = z.enum(liveEventStatuses);

const createLiveEventSchema = z.object({
  launchId: z.string().uuid(),
  name: z.string().trim().min(3).max(180),
  scheduledAt: z.string().datetime(),
  channel: z.string().trim().min(2).max(120),
  responsible: z.string().trim().min(2).max(120),
  status: statusSchema,
  accessUrl: z.string().trim().url().max(500).optional(),
  notes: z.string().trim().max(500).optional()
});

const listLiveEventSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    status: statusSchema.optional(),
    channel: z.string().trim().min(2).max(120).optional(),
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

const updateLiveEventSchema = z
  .object({
    name: z.string().trim().min(3).max(180).optional(),
    scheduledAt: z.string().datetime().optional(),
    channel: z.string().trim().min(2).max(120).optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    status: statusSchema.optional(),
    accessUrl: z.string().trim().url().max(500).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  liveEventId: z.string().uuid()
});

class LiveEventController {
  async create(request, response) {
    const payload = createLiveEventSchema.parse(request.body);
    const liveEvent = await liveEventService.create(request.auth.sub, payload);

    response.status(201).json(liveEvent);
  }

  async list(request, response) {
    const filters = listLiveEventSchema.parse(request.query);
    const liveEvents = await liveEventService.list(filters);

    response.status(200).json(liveEvents);
  }

  async update(request, response) {
    const { liveEventId } = paramsSchema.parse(request.params);
    const payload = updateLiveEventSchema.parse(request.body);
    const liveEvent = await liveEventService.update(request.auth.sub, liveEventId, payload);

    response.status(200).json(liveEvent);
  }

  async deactivate(request, response) {
    const { liveEventId } = paramsSchema.parse(request.params);
    const liveEvent = await liveEventService.deactivate(request.auth.sub, liveEventId);

    response.status(200).json(liveEvent);
  }
}

export const liveEventController = new LiveEventController();

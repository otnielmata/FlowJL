import { z } from "zod";

import { trafficConversionEventService } from "../services/traffic-conversion-event.service.js";

const originSchema = z.enum(["WEB", "CHECKOUT", "FORM", "WHATSAPP", "CRM", "ADS_PLATFORM", "MANUAL", "OTHER"]);
const statusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);

const createTrafficConversionEventSchema = z.object({
  launchId: z.string().uuid().optional(),
  campaignIds: z.array(z.string().uuid()).optional(),
  pixelIds: z.array(z.string().uuid()).optional(),
  name: z.string().trim().min(3).max(160),
  objective: z.string().trim().min(3).max(240),
  origin: originSchema,
  status: statusSchema.optional(),
  eventAt: z.string().datetime().optional()
});

const listTrafficConversionEventSchema = z.object({
  launchId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  pixelId: z.string().uuid().optional(),
  origin: originSchema.optional(),
  status: statusSchema.optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const updateTrafficConversionEventSchema = z
  .object({
    objective: z.string().trim().min(3).max(240).optional(),
    origin: originSchema.optional(),
    status: statusSchema.optional(),
    eventAt: z.string().datetime().nullable().optional(),
    reason: z.string().trim().min(3).max(500).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const updateTrafficConversionEventLinksSchema = z
  .object({
    campaignIds: z.array(z.string().uuid()).optional(),
    pixelIds: z.array(z.string().uuid()).optional(),
    reason: z.string().trim().min(3).max(500).optional()
  })
  .refine((value) => value.campaignIds !== undefined || value.pixelIds !== undefined, {
    message: "At least one link field must be informed"
  });

const paramsSchema = z.object({
  eventId: z.string().uuid()
});

class TrafficConversionEventController {
  async create(request, response) {
    const payload = createTrafficConversionEventSchema.parse(request.body);
    const event = await trafficConversionEventService.create(request.auth.sub, payload);

    response.status(201).json(event);
  }

  async list(request, response) {
    const filters = listTrafficConversionEventSchema.parse(request.query);
    const events = await trafficConversionEventService.list(filters);

    response.status(200).json(events);
  }

  async update(request, response) {
    const { eventId } = paramsSchema.parse(request.params);
    const payload = updateTrafficConversionEventSchema.parse(request.body);
    const event = await trafficConversionEventService.update(request.auth.sub, eventId, payload);

    response.status(200).json(event);
  }

  async updateLinks(request, response) {
    const { eventId } = paramsSchema.parse(request.params);
    const payload = updateTrafficConversionEventLinksSchema.parse(request.body);
    const event = await trafficConversionEventService.updateLinks(request.auth.sub, eventId, payload);

    response.status(200).json(event);
  }

  async deactivate(request, response) {
    const { eventId } = paramsSchema.parse(request.params);
    const event = await trafficConversionEventService.deactivate(request.auth.sub, eventId);

    response.status(200).json(event);
  }
}

export const trafficConversionEventController = new TrafficConversionEventController();

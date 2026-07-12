import { z } from "zod";

import { trafficPixelService } from "../services/traffic-pixel.service.js";

const platformSchema = z.enum(["META", "GOOGLE", "YOUTUBE", "TIKTOK", "LINKEDIN", "OTHER"]);
const statusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ERROR", "ARCHIVED"]);

const secretsSchema = z.object({
  accessToken: z.string().trim().min(4).max(4000).optional(),
  secret: z.string().trim().min(4).max(2000).optional(),
  tokenExpiresAt: z.string().datetime().optional()
});

const createTrafficPixelSchema = z.object({
  launchId: z.string().uuid().optional(),
  platform: platformSchema,
  externalPixelId: z.string().trim().min(2).max(240),
  purpose: z.string().trim().min(3).max(240),
  status: statusSchema.optional(),
  campaignIds: z.array(z.string().uuid()).optional(),
  conversionEventIds: z.array(z.string().uuid()).optional(),
  secrets: secretsSchema.optional()
});

const listTrafficPixelSchema = z.object({
  launchId: z.string().uuid().optional(),
  platform: platformSchema.optional(),
  status: statusSchema.optional(),
  campaignId: z.string().uuid().optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const updateTrafficPixelSchema = z
  .object({
    purpose: z.string().trim().min(3).max(240).optional(),
    status: statusSchema.optional(),
    secrets: secretsSchema.optional(),
    reason: z.string().trim().min(3).max(500).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const updateTrafficPixelLinksSchema = z
  .object({
    campaignIds: z.array(z.string().uuid()).optional(),
    conversionEventIds: z.array(z.string().uuid()).optional(),
    reason: z.string().trim().min(3).max(500).optional()
  })
  .refine((value) => value.campaignIds !== undefined || value.conversionEventIds !== undefined, {
    message: "At least one link field must be informed"
  });

const paramsSchema = z.object({
  pixelId: z.string().uuid()
});

class TrafficPixelController {
  async create(request, response) {
    const payload = createTrafficPixelSchema.parse(request.body);
    const pixel = await trafficPixelService.create(request.auth.sub, payload);

    response.status(201).json(pixel);
  }

  async list(request, response) {
    const filters = listTrafficPixelSchema.parse(request.query);
    const pixels = await trafficPixelService.list(filters);

    response.status(200).json(pixels);
  }

  async update(request, response) {
    const { pixelId } = paramsSchema.parse(request.params);
    const payload = updateTrafficPixelSchema.parse(request.body);
    const pixel = await trafficPixelService.update(request.auth.sub, pixelId, payload);

    response.status(200).json(pixel);
  }

  async updateLinks(request, response) {
    const { pixelId } = paramsSchema.parse(request.params);
    const payload = updateTrafficPixelLinksSchema.parse(request.body);
    const pixel = await trafficPixelService.updateLinks(request.auth.sub, pixelId, payload);

    response.status(200).json(pixel);
  }

  async deactivate(request, response) {
    const { pixelId } = paramsSchema.parse(request.params);
    const pixel = await trafficPixelService.deactivate(request.auth.sub, pixelId);

    response.status(200).json(pixel);
  }
}

export const trafficPixelController = new TrafficPixelController();

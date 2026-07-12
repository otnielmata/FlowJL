import { z } from "zod";

import { trafficCreativeService } from "../services/traffic-creative.service.js";

const formatSchema = z.enum(["IMAGE", "VIDEO", "CAROUSEL", "COPY", "STORY", "SHORTS", "OTHER"]);
const originSchema = z.enum(["ASSET_LIBRARY", "MANUAL", "AI", "EXTERNAL"]);
const statusSchema = z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "ACTIVE", "PAUSED", "ARCHIVED"]);
const classificationSchema = z.enum(["UNTESTED", "CONTROL", "WINNER", "LOSER", "LEARNING"]);

const performanceSchema = z.object({
  impressions: z.number().min(0).optional(),
  clicks: z.number().min(0).optional(),
  conversions: z.number().min(0).optional(),
  spend: z.number().min(0).optional()
});

const createTrafficCreativeSchema = z.object({
  campaignId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  name: z.string().trim().min(3).max(160),
  format: formatSchema,
  objective: z.string().trim().min(3).max(240),
  origin: originSchema,
  status: statusSchema,
  classification: classificationSchema.optional(),
  performance: performanceSchema.optional()
});

const listTrafficCreativeSchema = z.object({
  campaignId: z.string().uuid().optional(),
  launchId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  classification: classificationSchema.optional(),
  format: formatSchema.optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const updateTrafficCreativeSchema = z
  .object({
    assetId: z.string().uuid().nullable().optional(),
    objective: z.string().trim().min(3).max(240).optional(),
    status: statusSchema.optional(),
    classification: classificationSchema.optional(),
    performance: performanceSchema.optional(),
    reason: z.string().trim().min(3).max(500).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  creativeId: z.string().uuid()
});

class TrafficCreativeController {
  async create(request, response) {
    const payload = createTrafficCreativeSchema.parse(request.body);
    const creative = await trafficCreativeService.create(request.auth.sub, payload);

    response.status(201).json(creative);
  }

  async list(request, response) {
    const filters = listTrafficCreativeSchema.parse(request.query);
    const creatives = await trafficCreativeService.list(filters);

    response.status(200).json(creatives);
  }

  async update(request, response) {
    const { creativeId } = paramsSchema.parse(request.params);
    const payload = updateTrafficCreativeSchema.parse(request.body);
    const creative = await trafficCreativeService.update(request.auth.sub, creativeId, payload);

    response.status(200).json(creative);
  }

  async deactivate(request, response) {
    const { creativeId } = paramsSchema.parse(request.params);
    const creative = await trafficCreativeService.deactivate(request.auth.sub, creativeId);

    response.status(200).json(creative);
  }
}

export const trafficCreativeController = new TrafficCreativeController();

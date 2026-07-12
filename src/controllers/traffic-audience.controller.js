import { z } from "zod";

import { trafficAudienceService } from "../services/traffic-audience.service.js";

const statusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);

const segmentationCriteriaSchema = z.object({
  demographics: z.array(z.string().trim().min(1).max(120)).optional(),
  interests: z.array(z.string().trim().min(1).max(120)).optional(),
  behaviors: z.array(z.string().trim().min(1).max(120)).optional(),
  locations: z.array(z.string().trim().min(1).max(120)).optional(),
  exclusions: z.array(z.string().trim().min(1).max(120)).optional(),
  lookalikeSource: z.string().trim().min(2).max(240).optional(),
  customRules: z.array(z.string().trim().min(1).max(240)).optional()
});

const createTrafficAudienceSchema = z.object({
  launchId: z.string().uuid().optional(),
  campaignIds: z.array(z.string().uuid()).optional(),
  name: z.string().trim().min(3).max(160),
  objective: z.string().trim().min(3).max(240),
  strategy: z.string().trim().min(3).max(500),
  segmentationCriteria: segmentationCriteriaSchema,
  status: statusSchema.optional()
});

const listTrafficAudienceSchema = z.object({
  launchId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const updateTrafficAudienceSchema = z
  .object({
    campaignIds: z.array(z.string().uuid()).optional(),
    objective: z.string().trim().min(3).max(240).optional(),
    strategy: z.string().trim().min(3).max(500).optional(),
    segmentationCriteria: segmentationCriteriaSchema.optional(),
    status: statusSchema.optional(),
    reason: z.string().trim().min(3).max(500).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  audienceId: z.string().uuid()
});

class TrafficAudienceController {
  async create(request, response) {
    const payload = createTrafficAudienceSchema.parse(request.body);
    const audience = await trafficAudienceService.create(request.auth.sub, payload);

    response.status(201).json(audience);
  }

  async list(request, response) {
    const filters = listTrafficAudienceSchema.parse(request.query);
    const audiences = await trafficAudienceService.list(filters);

    response.status(200).json(audiences);
  }

  async update(request, response) {
    const { audienceId } = paramsSchema.parse(request.params);
    const payload = updateTrafficAudienceSchema.parse(request.body);
    const audience = await trafficAudienceService.update(request.auth.sub, audienceId, payload);

    response.status(200).json(audience);
  }

  async deactivate(request, response) {
    const { audienceId } = paramsSchema.parse(request.params);
    const audience = await trafficAudienceService.deactivate(request.auth.sub, audienceId);

    response.status(200).json(audience);
  }
}

export const trafficAudienceController = new TrafficAudienceController();

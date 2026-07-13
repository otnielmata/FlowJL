import { z } from "zod";

import { trafficCampaignService } from "../services/traffic-campaign.service.js";

const statusSchema = z.enum(["DRAFT", "PLANNED", "ACTIVE", "PAUSED", "FINISHED", "CANCELED"]);
const channelSchema = z.enum(["META", "GOOGLE", "YOUTUBE", "TIKTOK", "LINKEDIN", "OTHER"]);

const createTrafficCampaignSchema = z
  .object({
    launchId: z.string().uuid(),
    name: z.string().trim().min(3).max(160),
    objective: z.string().trim().min(3).max(240),
    channel: channelSchema,
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    status: statusSchema,
    budget: z.number().min(0).optional(),
    externalCampaignId: z.string().trim().min(1).max(240).optional()
  })
  .superRefine((value, context) => {
    if (new Date(value.periodStart).getTime() > new Date(value.periodEnd).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodStart must be before or equal to periodEnd",
        path: ["periodStart"]
      });
    }
  });

const listTrafficCampaignSchema = z.object({
  launchId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  channel: channelSchema.optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const updateTrafficCampaignSchema = z
  .object({
    name: z.string().trim().min(3).max(160).optional(),
    objective: z.string().trim().min(3).max(240).optional(),
    channel: channelSchema.optional(),
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
    status: statusSchema.optional(),
    budget: z.number().min(0).nullable().optional(),
    externalCampaignId: z.string().trim().min(1).max(240).nullable().optional(),
    reason: z.string().trim().min(3).max(500).optional()
  })
  .superRefine((value, context) => {
    if (value.periodStart && value.periodEnd && new Date(value.periodStart).getTime() > new Date(value.periodEnd).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodStart must be before or equal to periodEnd",
        path: ["periodStart"]
      });
    }
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  campaignId: z.string().uuid()
});

class TrafficCampaignController {
  async create(request, response) {
    const payload = createTrafficCampaignSchema.parse(request.body);
    const campaign = await trafficCampaignService.create(request.auth.sub, payload);

    response.status(201).json(campaign);
  }

  async list(request, response) {
    const filters = listTrafficCampaignSchema.parse(request.query);
    const campaigns = await trafficCampaignService.list(filters);

    response.status(200).json(campaigns);
  }

  async update(request, response) {
    const { campaignId } = paramsSchema.parse(request.params);
    const payload = updateTrafficCampaignSchema.parse(request.body);
    const campaign = await trafficCampaignService.update(request.auth.sub, campaignId, payload);

    response.status(200).json(campaign);
  }

  async deactivate(request, response) {
    const { campaignId } = paramsSchema.parse(request.params);
    const campaign = await trafficCampaignService.deactivate(request.auth.sub, campaignId);

    response.status(200).json(campaign);
  }
}

export const trafficCampaignController = new TrafficCampaignController();

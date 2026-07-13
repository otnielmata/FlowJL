import { z } from "zod";

import { trafficManagementService } from "../services/traffic-management.service.js";

const statusSchema = z.enum(["DRAFT", "PLANNED", "ACTIVE", "PAUSED", "FINISHED", "CANCELED"]);
const channelSchema = z.enum(["META", "GOOGLE", "YOUTUBE", "TIKTOK", "LINKEDIN", "OTHER"]);

const relationshipIdsSchema = z.array(z.string().uuid()).optional().default([]);

const listCampaignsSchema = z.object({
  launchId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  channel: channelSchema.optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional()
});

const createCampaignSchema = z
  .object({
    launchId: z.string().uuid(),
    name: z.string().trim().min(3).max(160),
    objective: z.string().trim().min(3).max(240),
    channel: channelSchema,
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    status: statusSchema,
    budget: z.number().min(0).optional(),
    externalCampaignId: z.string().trim().min(1).max(240).optional(),
    creativeIds: relationshipIdsSchema,
    audienceIds: relationshipIdsSchema,
    pixelIds: relationshipIdsSchema,
    conversionEventIds: relationshipIdsSchema
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

const updateCampaignSchema = z
  .object({
    name: z.string().trim().min(3).max(160).optional(),
    objective: z.string().trim().min(3).max(240).optional(),
    channel: channelSchema.optional(),
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
    status: statusSchema.optional(),
    budget: z.number().min(0).nullable().optional(),
    externalCampaignId: z.string().trim().min(1).max(240).nullable().optional(),
    creativeIds: z.array(z.string().uuid()).optional(),
    audienceIds: z.array(z.string().uuid()).optional(),
    pixelIds: z.array(z.string().uuid()).optional(),
    conversionEventIds: z.array(z.string().uuid()).optional(),
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

const dashboardSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    status: statusSchema.optional(),
    channel: channelSchema.optional(),
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional()
  })
  .superRefine((value, context) => {
    if (value.periodStart && value.periodEnd && new Date(value.periodStart).getTime() > new Date(value.periodEnd).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodStart must be before or equal to periodEnd",
        path: ["periodStart"]
      });
    }
  });

const compareSchema = z.object({
  launchId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  channel: channelSchema.optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  campaignIds: z.array(z.string().uuid()).min(2).max(10)
});

const actionSchema = z.object({
  action: z.enum(["PAUSE", "FINISH", "DUPLICATE", "EXPORT_REPORT"]),
  confirmation: z.boolean().optional(),
  reason: z.string().trim().min(3).max(500).optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional()
});

const paramsSchema = z.object({
  campaignId: z.string().uuid()
});

class TrafficManagementController {
  async listCampaigns(request, response) {
    const filters = listCampaignsSchema.parse(request.query);
    const result = await trafficManagementService.listCampaigns(filters);

    response.status(200).json(result);
  }

  async createCampaign(request, response) {
    const payload = createCampaignSchema.parse(request.body);
    const result = await trafficManagementService.createCampaign(request.auth.sub, payload);

    response.status(201).json(result);
  }

  async updateCampaign(request, response) {
    const { campaignId } = paramsSchema.parse(request.params);
    const payload = updateCampaignSchema.parse(request.body);
    const result = await trafficManagementService.updateCampaign(request.auth.sub, campaignId, payload);

    response.status(200).json(result);
  }

  async getDashboard(request, response) {
    const filters = dashboardSchema.parse(request.query);
    const result = await trafficManagementService.getDashboard(filters);

    response.status(200).json(result);
  }

  async compareCampaigns(request, response) {
    const payload = compareSchema.parse(request.body);
    const result = await trafficManagementService.compareCampaigns(payload);

    response.status(200).json(result);
  }

  async runAction(request, response) {
    const { campaignId } = paramsSchema.parse(request.params);
    const payload = actionSchema.parse(request.body);
    const result = await trafficManagementService.runCampaignAction(request.auth.sub, campaignId, payload);

    response.status(200).json(result);
  }
}

export const trafficManagementController = new TrafficManagementController();

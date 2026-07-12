import { z } from "zod";

import { emailCampaignService } from "../services/email-campaign.service.js";

const createEmailCampaignSchema = z.object({
  launchId: z.string().uuid(),
  type: z.enum(["NURTURE", "SALES", "EVENT", "WEBINAR"]),
  subject: z.string().trim().min(3).max(240),
  objective: z.string().trim().min(3).max(180),
  cta: z.string().trim().min(3).max(180),
  body: z.string().trim().min(3).max(10000).optional(),
  status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "SENT"]),
  reviewStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  plannedSendAt: z.string().datetime().optional()
});

const listEmailCampaignsQuerySchema = z.object({
  launchId: z.string().uuid().optional(),
  type: z.enum(["NURTURE", "SALES", "EVENT", "WEBINAR"]).optional(),
  status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "SENT"]).optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const paramsSchema = z.object({
  emailId: z.string().uuid()
});

class EmailCampaignController {
  async create(request, response) {
    const payload = createEmailCampaignSchema.parse(request.body);
    const email = await emailCampaignService.create(request.auth.sub, payload);

    response.status(201).json(email);
  }

  async list(request, response) {
    const filters = listEmailCampaignsQuerySchema.parse(request.query);
    const emails = await emailCampaignService.list(filters);

    response.status(200).json(emails);
  }

  async deactivate(request, response) {
    const { emailId } = paramsSchema.parse(request.params);
    const email = await emailCampaignService.deactivate(request.auth.sub, emailId);

    response.status(200).json(email);
  }
}

export const emailCampaignController = new EmailCampaignController();

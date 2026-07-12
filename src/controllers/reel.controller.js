import { z } from "zod";

import { reelService } from "../services/reel.service.js";

const createReelSchema = z.object({
  launchId: z.string().uuid().optional(),
  contentPlanId: z.string().uuid().optional(),
  contentIdeaId: z.string().uuid().optional(),
  sourceType: z.enum(["MANUAL", "IDEA", "CONTENT_PLAN", "AI"]),
  theme: z.string().trim().min(3).max(180),
  objective: z.string().trim().min(3).max(180),
  hook: z.string().trim().min(3).max(240),
  cta: z.string().trim().min(3).max(180),
  script: z.string().trim().min(3).max(4000).optional(),
  caption: z.string().trim().min(3).max(2200).optional(),
  operationalStatus: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"]),
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  scheduledAt: z.string().datetime().optional()
});

const updateReelSchema = z.object({
  script: z.string().trim().min(3).max(4000),
  caption: z.string().trim().min(3).max(2200).optional(),
  operationalStatus: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"]),
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  scheduledAt: z.string().datetime().optional()
});

const paramsSchema = z.object({
  reelId: z.string().uuid()
});

class ReelController {
  async create(request, response) {
    const payload = createReelSchema.parse(request.body);
    const reel = await reelService.create(request.auth.sub, payload);

    response.status(201).json(reel);
  }

  async update(request, response) {
    const { reelId } = paramsSchema.parse(request.params);
    const payload = updateReelSchema.parse(request.body);
    const reel = await reelService.update(request.auth.sub, reelId, payload);

    response.status(200).json(reel);
  }
}

export const reelController = new ReelController();

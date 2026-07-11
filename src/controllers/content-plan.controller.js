import { z } from "zod";

import { contentPlanService } from "../services/content-plan.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const itemSchema = z.object({
  theme: z.string().trim().min(3).max(200),
  format: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(3).max(200),
  cta: z.string().trim().min(3).max(200),
  stage: z.string().trim().min(3).max(120),
  periodLabel: z.string().trim().min(3).max(120),
  active: z.boolean().optional()
});

const contentPlanPayloadSchema = z.object({
  items: z.array(itemSchema).min(1)
});

class ContentPlanController {
  async create(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = contentPlanPayloadSchema.parse(request.body);
    const contentPlan = await contentPlanService.create(request.auth.sub, launchId, payload);

    response.status(201).json(contentPlan);
  }

  async update(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = contentPlanPayloadSchema.parse(request.body);
    const contentPlan = await contentPlanService.update(request.auth.sub, launchId, payload);

    response.status(200).json(contentPlan);
  }
}

export const contentPlanController = new ContentPlanController();

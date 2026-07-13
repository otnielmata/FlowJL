import { z } from "zod";

import { aiMetricInsightFocusAreas } from "../models/ai-metric-insight.model.js";
import { aiMetricInsightService } from "../services/ai-metric-insight.service.js";

const generateMetricInsightSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    objective: z.string().trim().min(3).max(180),
    focusArea: z.enum(aiMetricInsightFocusAreas).optional().default("GENERAL"),
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
    tags: z.array(z.string().trim().min(2).max(60)).max(20).optional().default([])
  })
  .refine((data) => Boolean(data.periodStart) === Boolean(data.periodEnd), {
    message: "periodStart and periodEnd must be informed together",
    path: ["periodStart"]
  });

const paramsSchema = z.object({
  insightId: z.string().uuid()
});

class AiMetricInsightController {
  async generate(request, response) {
    const payload = generateMetricInsightSchema.parse(request.body);
    const insight = await aiMetricInsightService.generate(request.auth.sub, payload);

    response.status(201).json(insight);
  }

  async getById(request, response) {
    const { insightId } = paramsSchema.parse(request.params);
    const insight = await aiMetricInsightService.getById(request.auth.sub, insightId);

    response.status(200).json(insight);
  }
}

export const aiMetricInsightController = new AiMetricInsightController();

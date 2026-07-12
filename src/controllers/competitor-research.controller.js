import { z } from "zod";

import { competitorResearchService } from "../services/competitor-research.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const createCompetitorResearchSchema = z.object({
  competitorName: z.string().trim().min(3).max(180),
  channel: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(3).max(240),
  promise: z.string().trim().min(3).max(240),
  trigger: z.string().trim().min(3).max(180),
  observations: z.string().trim().min(3).max(4000),
  capturedAt: z.string().datetime().optional().default(() => new Date().toISOString())
});

class CompetitorResearchController {
  async create(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = createCompetitorResearchSchema.parse(request.body);
    const research = await competitorResearchService.create(request.auth.sub, launchId, payload);

    response.status(201).json(research);
  }
}

export const competitorResearchController = new CompetitorResearchController();

import { z } from "zod";

import { marketResearchService } from "../services/market-research.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const createMarketResearchSchema = z.object({
  briefing: z.string().trim().min(20).max(4000),
  objective: z.string().trim().min(8).max(500),
  productContext: z.string().trim().min(20).max(4000)
});

class MarketResearchController {
  async create(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = createMarketResearchSchema.parse(request.body);
    const research = await marketResearchService.create(request.auth.sub, launchId, payload);

    response.status(201).json(research);
  }
}

export const marketResearchController = new MarketResearchController();

import { z } from "zod";

import { positioningService } from "../services/positioning.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const positioningPayloadSchema = z.object({
  thesis: z.string().trim().min(10).max(1200),
  centralPromise: z.string().trim().min(10).max(500),
  differentiators: z.array(z.string().trim().min(3).max(240)).min(1),
  references: z.array(z.string().trim().min(3).max(300)).min(1)
});

class PositioningController {
  async create(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = positioningPayloadSchema.parse(request.body);
    const positioning = await positioningService.create(request.auth.sub, launchId, payload);

    response.status(201).json(positioning);
  }

  async update(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = positioningPayloadSchema.parse(request.body);
    const positioning = await positioningService.update(request.auth.sub, launchId, payload);

    response.status(200).json(positioning);
  }
}

export const positioningController = new PositioningController();

import { z } from "zod";

import { offerService } from "../services/offer.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const offerPayloadSchema = z.object({
  product: z.string().trim().min(3).max(180),
  transformation: z.string().trim().min(10).max(1000),
  promise: z.string().trim().min(10).max(500),
  benefits: z.array(z.string().trim().min(3).max(240)).min(1),
  differentials: z.array(z.string().trim().min(3).max(240)).min(1),
  positioningContext: z.string().trim().min(3).max(500).optional()
});

class OfferController {
  async create(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = offerPayloadSchema.parse(request.body);
    const offer = await offerService.create(request.auth.sub, launchId, payload);

    response.status(201).json(offer);
  }

  async update(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = offerPayloadSchema.parse(request.body);
    const offer = await offerService.update(request.auth.sub, launchId, payload);

    response.status(200).json(offer);
  }
}

export const offerController = new OfferController();

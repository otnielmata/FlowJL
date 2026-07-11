import { z } from "zod";

import { carouselService } from "../services/carousel.service.js";

const carouselCardSchema = z.object({
  order: z.number().int().min(1).optional(),
  message: z.string().trim().min(1).max(500)
});

const createCarouselSchema = z.object({
  launchId: z.string().uuid().optional(),
  contentPlanId: z.string().uuid().optional(),
  theme: z.string().trim().min(3).max(180),
  objective: z.string().trim().min(3).max(180),
  cta: z.string().trim().min(3).max(180),
  cardsCount: z.number().int().min(1).max(20),
  cards: z.array(carouselCardSchema).max(20).optional().default([]),
  operationalStatus: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"]),
  reviewStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  ownerRole: z.string().trim().min(3).max(80).optional()
});

const updateCarouselSchema = z.object({
  cardsCount: z.number().int().min(1).max(20),
  cards: z.array(carouselCardSchema).min(1).max(20),
  operationalStatus: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"]),
  reviewStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  ownerRole: z.string().trim().min(3).max(80).optional()
});

const paramsSchema = z.object({
  carouselId: z.string().uuid()
});

class CarouselController {
  async create(request, response) {
    const payload = createCarouselSchema.parse(request.body);
    const carousel = await carouselService.create(request.auth.sub, payload);

    response.status(201).json(carousel);
  }

  async update(request, response) {
    const { carouselId } = paramsSchema.parse(request.params);
    const payload = updateCarouselSchema.parse(request.body);
    const carousel = await carouselService.update(request.auth.sub, carouselId, payload);

    response.status(200).json(carousel);
  }
}

export const carouselController = new CarouselController();

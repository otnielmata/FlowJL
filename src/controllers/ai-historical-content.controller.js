import { z } from "zod";

import { historicalContentFormats, historicalContentOrigins } from "../models/ai-historical-content.model.js";
import { aiHistoricalContentService } from "../services/ai-historical-content.service.js";

const formatSchema = z.enum(historicalContentFormats);
const originSchema = z.enum(historicalContentOrigins);

const performanceSchema = z.object({
  views: z.number().int().nonnegative().optional().default(0),
  clicks: z.number().int().nonnegative().optional().default(0),
  conversions: z.number().int().nonnegative().optional().default(0),
  revenue: z.number().nonnegative().optional().default(0),
  engagementRate: z.number().nonnegative().optional().default(0),
  score: z.number().nonnegative()
});

const createHistoricalContentSchema = z.object({
  launchId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(3).max(180),
  format: formatSchema,
  objective: z.string().trim().min(3).max(180),
  summary: z.string().trim().min(8).max(2000),
  tags: z.array(z.string().trim().min(2).max(60)).max(20).optional().default([]),
  origin: originSchema.optional().default("ORIGINAL"),
  reusedFromContentId: z.string().uuid().nullable().optional(),
  performance: performanceSchema,
  sensitiveNotes: z.string().trim().max(1000).nullable().optional()
});

const listHistoricalContentSchema = z.object({
  launchId: z.string().uuid().optional(),
  format: formatSchema.optional(),
  objective: z.string().trim().min(3).max(180).optional(),
  origin: originSchema.optional(),
  tags: z
    .string()
    .transform((value) => value.split(",").map((tag) => tag.trim()).filter(Boolean))
    .optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const recommendationSchema = z.object({
  launchId: z.string().uuid(),
  objective: z.string().trim().min(3).max(180),
  format: formatSchema.optional(),
  tags: z.array(z.string().trim().min(2).max(60)).max(20).optional().default([]),
  limit: z.number().int().min(1).max(20).optional().default(5)
});

const paramsSchema = z.object({
  contentId: z.string().uuid()
});

class AiHistoricalContentController {
  async create(request, response) {
    const payload = createHistoricalContentSchema.parse(request.body);
    const content = await aiHistoricalContentService.create(request.auth.sub, payload);

    response.status(201).json(content);
  }

  async list(request, response) {
    const filters = listHistoricalContentSchema.parse(request.query);
    const contents = await aiHistoricalContentService.list(request.auth.sub, filters);

    response.status(200).json(contents);
  }

  async getById(request, response) {
    const { contentId } = paramsSchema.parse(request.params);
    const content = await aiHistoricalContentService.getById(contentId);

    response.status(200).json(content);
  }

  async recommend(request, response) {
    const payload = recommendationSchema.parse(request.body);
    const recommendations = await aiHistoricalContentService.recommend(request.auth.sub, payload);

    response.status(200).json(recommendations);
  }

  async deactivate(request, response) {
    const { contentId } = paramsSchema.parse(request.params);
    const content = await aiHistoricalContentService.deactivate(request.auth.sub, contentId);

    response.status(200).json(content);
  }
}

export const aiHistoricalContentController = new AiHistoricalContentController();

import { z } from "zod";

import { contentIdeaService } from "../services/content-idea.service.js";

const createContentIdeaSchema = z.object({
  launchId: z.string().uuid().optional(),
  theme: z.string().trim().min(3).max(180),
  objective: z.string().trim().min(3).max(180),
  suggestedFormat: z.string().trim().min(3).max(120),
  observations: z.string().trim().min(3).max(1000)
});

const listContentIdeasQuerySchema = z.object({
  launchId: z.string().uuid().optional(),
  objective: z.string().trim().min(1).max(180).optional(),
  status: z.enum(["BACKLOG", "SELECTED", "PRODUCED", "DISCARDED"]).optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

const paramsSchema = z.object({
  ideaId: z.string().uuid()
});

class ContentIdeaController {
  async create(request, response) {
    const payload = createContentIdeaSchema.parse(request.body);
    const idea = await contentIdeaService.create(request.auth.sub, payload);

    response.status(201).json(idea);
  }

  async list(request, response) {
    const filters = listContentIdeasQuerySchema.parse(request.query);
    const ideas = await contentIdeaService.list(filters);

    response.status(200).json(ideas);
  }

  async deactivate(request, response) {
    const { ideaId } = paramsSchema.parse(request.params);
    const idea = await contentIdeaService.deactivate(request.auth.sub, ideaId);

    response.status(200).json(idea);
  }
}

export const contentIdeaController = new ContentIdeaController();

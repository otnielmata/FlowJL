import { z } from "zod";

import { editorialLineService } from "../services/editorial-line.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const pillarSchema = z.object({
  name: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(3).max(240),
  priority: z.number().int().min(1).max(5),
  active: z.boolean().optional()
});

const editorialLinePayloadSchema = z.object({
  pillars: z.array(pillarSchema).min(1)
});

class EditorialLineController {
  async create(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = editorialLinePayloadSchema.parse(request.body);
    const editorialLine = await editorialLineService.create(request.auth.sub, launchId, payload);

    response.status(201).json(editorialLine);
  }

  async update(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = editorialLinePayloadSchema.parse(request.body);
    const editorialLine = await editorialLineService.update(request.auth.sub, launchId, payload);

    response.status(200).json(editorialLine);
  }
}

export const editorialLineController = new EditorialLineController();

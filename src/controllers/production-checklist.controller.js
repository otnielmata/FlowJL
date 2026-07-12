import { z } from "zod";

import { productionChecklistService } from "../services/production-checklist.service.js";

const contentTypeSchema = z.enum(["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL_CAMPAIGN", "YOUTUBE_CONTENT"]);
const statusSchema = z.enum(["OPEN", "PARTIAL", "COMPLETED", "REOPENED"]);

const createChecklistItemSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(3).max(160),
  required: z.boolean().optional(),
  completed: z.boolean().optional(),
  notes: z.string().trim().min(3).max(500).optional()
});

const updateChecklistItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(3).max(160).optional(),
  required: z.boolean().optional(),
  completed: z.boolean().optional(),
  notes: z.string().trim().min(3).max(500).nullable().optional()
});

const createChecklistSchema = z.object({
  contentType: contentTypeSchema,
  contentId: z.string().uuid(),
  items: z.array(createChecklistItemSchema).min(1).optional(),
  conclude: z.boolean().optional()
});

const listChecklistSchema = z.object({
  launchId: z.string().uuid().optional(),
  contentType: contentTypeSchema.optional(),
  contentId: z.string().uuid().optional(),
  status: statusSchema.optional()
});

const updateChecklistSchema = z
  .object({
    items: z.array(updateChecklistItemSchema).min(1).optional(),
    conclude: z.boolean().optional()
  })
  .refine((value) => value.items || value.conclude !== undefined, {
    message: "At least one field must be informed"
  });

const reopenChecklistSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

const paramsSchema = z.object({
  checklistId: z.string().uuid()
});

class ProductionChecklistController {
  async create(request, response) {
    const payload = createChecklistSchema.parse(request.body);
    const checklist = await productionChecklistService.create(request.auth.sub, payload);

    response.status(201).json(checklist);
  }

  async list(request, response) {
    const filters = listChecklistSchema.parse(request.query);
    const checklists = await productionChecklistService.list(filters);

    response.status(200).json(checklists);
  }

  async update(request, response) {
    const { checklistId } = paramsSchema.parse(request.params);
    const payload = updateChecklistSchema.parse(request.body);
    const checklist = await productionChecklistService.update(request.auth.sub, checklistId, payload);

    response.status(200).json(checklist);
  }

  async reopen(request, response) {
    const { checklistId } = paramsSchema.parse(request.params);
    const payload = reopenChecklistSchema.parse(request.body);
    const checklist = await productionChecklistService.reopen(request.auth.sub, checklistId, payload);

    response.status(200).json(checklist);
  }
}

export const productionChecklistController = new ProductionChecklistController();

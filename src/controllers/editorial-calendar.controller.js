import { z } from "zod";

import { editorialCalendarService } from "../services/editorial-calendar.service.js";

const createEditorialCalendarItemSchema = z.object({
  contentType: z.enum(["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL_CAMPAIGN", "YOUTUBE_CONTENT"]),
  contentId: z.string().uuid(),
  channel: z.string().trim().min(2).max(80),
  publishAt: z.string().datetime(),
  responsible: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(500).optional()
});

const listEditorialCalendarSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    channel: z.string().trim().min(2).max(80).optional()
  })
  .superRefine((value, context) => {
    if (value.startAt && value.endAt && new Date(value.startAt).getTime() > new Date(value.endAt).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startAt must be before or equal to endAt",
        path: ["startAt"]
      });
    }
  });

const updateEditorialCalendarItemSchema = z
  .object({
    channel: z.string().trim().min(2).max(80).optional(),
    publishAt: z.string().datetime().optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    notes: z.string().trim().max(500).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  itemId: z.string().uuid()
});

class EditorialCalendarController {
  async create(request, response) {
    const payload = createEditorialCalendarItemSchema.parse(request.body);
    const item = await editorialCalendarService.create(request.auth.sub, payload);

    response.status(201).json(item);
  }

  async list(request, response) {
    const filters = listEditorialCalendarSchema.parse(request.query);
    const calendar = await editorialCalendarService.list(filters);

    response.status(200).json(calendar);
  }

  async update(request, response) {
    const { itemId } = paramsSchema.parse(request.params);
    const payload = updateEditorialCalendarItemSchema.parse(request.body);
    const item = await editorialCalendarService.update(request.auth.sub, itemId, payload);

    response.status(200).json(item);
  }
}

export const editorialCalendarController = new EditorialCalendarController();

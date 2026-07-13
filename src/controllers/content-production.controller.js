import { z } from "zod";

import {
  contentProductionActionTypes,
  contentProductionChannels,
  contentProductionFormats,
  contentProductionStatuses
} from "../models/content-production.model.js";
import { contentProductionService } from "../services/content-production.service.js";

const formatSchema = z.enum(contentProductionFormats);
const channelSchema = z.enum(contentProductionChannels);
const statusSchema = z.enum(contentProductionStatuses);
const actionTypeSchema = z.enum(contentProductionActionTypes);

const attachmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(180),
  url: z.string().trim().url(),
  mediaType: z.string().trim().min(2).max(120).optional()
});

const referenceSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(2).max(120),
  url: z.string().trim().url()
});

const publicationSchema = z.object({
  publishAt: z.string().datetime().optional(),
  publishedAt: z.string().datetime().optional(),
  status: z.enum(["NOT_SCHEDULED", "SCHEDULED", "PUBLISHED"]).optional()
});

const createContentProductionSchema = z.object({
  launchId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().max(500).optional(),
  body: z.string().trim().min(10).max(12000),
  objective: z.string().trim().min(3).max(180),
  format: formatSchema,
  channel: channelSchema,
  responsible: z.string().trim().min(2).max(120),
  status: statusSchema,
  attachments: z.array(attachmentSchema).max(20).optional().default([]),
  references: z.array(referenceSchema).max(20).optional().default([]),
  publication: publicationSchema.optional(),
  actorName: z.string().trim().min(2).max(120)
});

const listContentProductionSchema = z.object({
  launchId: z.string().uuid().optional(),
  format: formatSchema.optional(),
  channel: channelSchema.optional(),
  status: statusSchema.optional()
});

const updateContentProductionSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    summary: z.string().trim().max(500).optional(),
    body: z.string().trim().min(10).max(12000).optional(),
    objective: z.string().trim().min(3).max(180).optional(),
    format: formatSchema.optional(),
    channel: channelSchema.optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    status: statusSchema.optional(),
    attachments: z.array(attachmentSchema).max(20).optional(),
    references: z.array(referenceSchema).max(20).optional(),
    publication: publicationSchema.optional(),
    actorName: z.string().trim().min(2).max(120)
  })
  .refine((value) => Object.keys(value).length > 1 || (Object.keys(value).length === 1 && !value.actorName), {
    message: "At least one field must be informed"
  });

const actionSchema = z.object({
  actionType: actionTypeSchema,
  targetChannel: channelSchema.optional(),
  approverUserId: z.string().trim().min(2).max(120).optional(),
  approverName: z.string().trim().min(2).max(120).optional(),
  reason: z.string().trim().min(3).max(500).optional(),
  actorName: z.string().trim().min(2).max(120)
});

const paramsSchema = z.object({
  contentId: z.string().uuid()
});

class ContentProductionController {
  async create(request, response) {
    const payload = createContentProductionSchema.parse(request.body);
    const content = await contentProductionService.create(request.auth.sub, payload);

    response.status(201).json(content);
  }

  async list(request, response) {
    const filters = listContentProductionSchema.parse(request.query);
    const items = await contentProductionService.list(filters);

    response.status(200).json(items);
  }

  async getById(request, response) {
    const { contentId } = paramsSchema.parse(request.params);
    const content = await contentProductionService.getById(contentId);

    response.status(200).json(content);
  }

  async update(request, response) {
    const { contentId } = paramsSchema.parse(request.params);
    const payload = updateContentProductionSchema.parse(request.body);
    const content = await contentProductionService.update(request.auth.sub, contentId, payload);

    response.status(200).json(content);
  }

  async runAction(request, response) {
    const { contentId } = paramsSchema.parse(request.params);
    const payload = actionSchema.parse(request.body);
    const content = await contentProductionService.runAction(request.auth.sub, contentId, payload);

    response.status(200).json(content);
  }
}

export const contentProductionController = new ContentProductionController();

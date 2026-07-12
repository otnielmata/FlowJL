import { z } from "zod";

import { storySequenceService } from "../services/story-sequence.service.js";

const storyBlockSchema = z.object({
  order: z.number().int().min(1).optional(),
  text: z.string().trim().min(1).max(500)
});

const createStorySequenceSchema = z.object({
  launchId: z.string().uuid().optional(),
  smartScheduleId: z.string().uuid().optional(),
  theme: z.string().trim().min(3).max(180),
  objective: z.string().trim().min(3).max(180),
  cta: z.string().trim().min(3).max(180),
  blocksCount: z.number().int().min(1).max(20),
  blocks: z.array(storyBlockSchema).max(20).optional().default([]),
  operationalStatus: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"]),
  ownerRole: z.string().trim().min(3).max(80).optional(),
  publishAt: z.string().datetime().optional()
});

const updateStorySequenceSchema = z.object({
  blocksCount: z.number().int().min(1).max(20),
  blocks: z.array(storyBlockSchema).min(1).max(20),
  operationalStatus: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"]),
  ownerRole: z.string().trim().min(3).max(80).optional(),
  publishAt: z.string().datetime().optional()
});

const paramsSchema = z.object({
  sequenceId: z.string().uuid()
});

class StorySequenceController {
  async create(request, response) {
    const payload = createStorySequenceSchema.parse(request.body);
    const sequence = await storySequenceService.create(request.auth.sub, payload);

    response.status(201).json(sequence);
  }

  async update(request, response) {
    const { sequenceId } = paramsSchema.parse(request.params);
    const payload = updateStorySequenceSchema.parse(request.body);
    const sequence = await storySequenceService.update(request.auth.sub, sequenceId, payload);

    response.status(200).json(sequence);
  }
}

export const storySequenceController = new StorySequenceController();

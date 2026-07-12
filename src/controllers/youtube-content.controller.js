import { z } from "zod";

import { youtubeContentService } from "../services/youtube-content.service.js";

const createYouTubeContentSchema = z.object({
  launchId: z.string().uuid(),
  theme: z.string().trim().min(3).max(180),
  objective: z.string().trim().min(3).max(180),
  format: z.string().trim().min(3).max(120),
  cta: z.string().trim().min(3).max(180),
  script: z.string().trim().min(3).max(10000).optional(),
  ownerRole: z.string().trim().min(3).max(80).optional(),
  operationalStatus: z.enum(["PLANNED", "SCRIPTING", "RECORDING", "EDITING", "SCHEDULED", "PUBLISHED"]).optional(),
  recordingAt: z.string().datetime().optional(),
  publishAt: z.string().datetime().optional()
});

const updateYouTubeContentSchema = z
  .object({
    script: z.string().trim().min(3).max(10000).optional(),
    ownerRole: z.string().trim().min(3).max(80).optional(),
    operationalStatus: z.enum(["PLANNED", "SCRIPTING", "RECORDING", "EDITING", "SCHEDULED", "PUBLISHED"]).optional(),
    recordingAt: z.string().datetime().optional(),
    publishAt: z.string().datetime().optional()
  })
  .refine(
    (payload) =>
      payload.script !== undefined ||
      payload.ownerRole !== undefined ||
      payload.operationalStatus !== undefined ||
      payload.recordingAt !== undefined ||
      payload.publishAt !== undefined,
    {
      message: "At least one field must be informed for update"
    }
  );

const paramsSchema = z.object({
  contentId: z.string().uuid()
});

class YouTubeContentController {
  async create(request, response) {
    const payload = createYouTubeContentSchema.parse(request.body);
    const content = await youtubeContentService.create(request.auth.sub, payload);

    response.status(201).json(content);
  }

  async update(request, response) {
    const { contentId } = paramsSchema.parse(request.params);
    const payload = updateYouTubeContentSchema.parse(request.body);
    const content = await youtubeContentService.update(request.auth.sub, contentId, payload);

    response.status(200).json(content);
  }

  async deactivate(request, response) {
    const { contentId } = paramsSchema.parse(request.params);
    const content = await youtubeContentService.deactivate(request.auth.sub, contentId);

    response.status(200).json(content);
  }
}

export const youtubeContentController = new YouTubeContentController();

import { z } from "zod";

import { contentStatusService } from "../services/content-status.service.js";

const contentTypeSchema = z.enum(["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL_CAMPAIGN", "YOUTUBE_CONTENT"]);

const paramsSchema = z.object({
  contentType: contentTypeSchema,
  contentId: z.string().uuid()
});

const changeStatusSchema = z.object({
  targetStatus: z.string().trim().min(3).max(40),
  reason: z.string().trim().min(3).max(500).optional()
});

class ContentStatusController {
  async changeStatus(request, response) {
    const { contentType, contentId } = paramsSchema.parse(request.params);
    const payload = changeStatusSchema.parse(request.body);
    const content = await contentStatusService.changeStatus(request.auth.sub, contentType, contentId, payload);

    response.status(200).json(content);
  }

  async listHistory(request, response) {
    const { contentType, contentId } = paramsSchema.parse(request.params);
    const history = await contentStatusService.listHistory(contentType, contentId);

    response.status(200).json(history);
  }
}

export const contentStatusController = new ContentStatusController();

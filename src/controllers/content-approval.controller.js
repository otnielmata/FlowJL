import { z } from "zod";

import { contentApprovalService } from "../services/content-approval.service.js";

const paramsSchema = z.object({
  contentType: z.enum(["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL_CAMPAIGN", "YOUTUBE_CONTENT"]),
  contentId: z.string().uuid()
});

const changeStatusSchema = z.object({
  targetStatus: z.enum(["CREATED", "REVIEW", "EXPERT", "APPROVED", "PUBLISHED"]),
  observations: z.string().trim().min(3).max(1000).optional()
});

class ContentApprovalController {
  async changeStatus(request, response) {
    const { contentType, contentId } = paramsSchema.parse(request.params);
    const payload = changeStatusSchema.parse(request.body);
    const approval = await contentApprovalService.changeStatus(request.auth.sub, contentType, contentId, payload);

    response.status(200).json(approval);
  }
}

export const contentApprovalController = new ContentApprovalController();

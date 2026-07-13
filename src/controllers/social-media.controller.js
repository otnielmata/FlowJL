import { z } from "zod";

import { socialMediaService } from "../services/social-media.service.js";

const previewSchema = z.object({
  headline: z.string().trim().min(2).max(160).optional(),
  caption: z.string().trim().min(2).max(2200).optional(),
  callToAction: z.string().trim().min(2).max(160).optional(),
  visualFormat: z.string().trim().min(2).max(80).optional(),
  thumbnailUrl: z.string().trim().url().optional(),
  hashtags: z.array(z.string().trim().min(2).max(50)).max(20).optional()
});

const listSocialMediaSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    channel: z.string().trim().min(2).max(80).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional()
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

const schedulePublicationSchema = z.object({
  contentType: z.enum(["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL_CAMPAIGN", "YOUTUBE_CONTENT"]),
  contentId: z.string().uuid(),
  channel: z.string().trim().min(2).max(80),
  publishAt: z.string().datetime(),
  responsible: z.string().trim().min(2).max(120),
  action: z.enum(["SEND_TO_APPROVAL", "SCHEDULE", "PUBLISH"]),
  preview: previewSchema.optional()
});

const recordPerformanceSchema = z.object({
  publishedUrl: z.string().trim().url(),
  reach: z.number().int().min(0),
  likes: z.number().int().min(0),
  comments: z.number().int().min(0),
  shares: z.number().int().min(0),
  saves: z.number().int().min(0)
});

const paramsSchema = z.object({
  publicationId: z.string().uuid()
});

class SocialMediaController {
  async list(request, response) {
    const filters = listSocialMediaSchema.parse(request.query);
    const result = await socialMediaService.list(filters);

    response.status(200).json(result);
  }

  async schedulePublication(request, response) {
    const payload = schedulePublicationSchema.parse(request.body);
    const result = await socialMediaService.schedulePublication(request.auth.sub, payload);

    response.status(201).json(result);
  }

  async recordPerformance(request, response) {
    const { publicationId } = paramsSchema.parse(request.params);
    const payload = recordPerformanceSchema.parse(request.body);
    const result = await socialMediaService.recordPerformance(request.auth.sub, publicationId, payload);

    response.status(200).json(result);
  }
}

export const socialMediaController = new SocialMediaController();

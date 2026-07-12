import { z } from "zod";

import { publicationService } from "../services/publication.service.js";

const createPublicationSchema = z.object({
  contentType: z.enum(["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL_CAMPAIGN", "YOUTUBE_CONTENT"]),
  contentId: z.string().uuid(),
  channel: z.string().trim().min(2).max(80),
  publishAt: z.string().datetime(),
  responsible: z.string().trim().min(2).max(120),
  status: z.enum(["PLANNED", "SCHEDULED", "PUBLISHED", "ISSUE"]).optional(),
  issueReason: z.string().trim().min(3).max(500).optional()
}).superRefine((value, context) => {
  if (value.status === "ISSUE" && !value.issueReason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "issueReason is required when status is ISSUE",
      path: ["issueReason"]
    });
  }
});

const listPublicationSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    status: z.enum(["PLANNED", "SCHEDULED", "PUBLISHED", "ISSUE"]).optional(),
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

const updatePublicationSchema = z
  .object({
    channel: z.string().trim().min(2).max(80).optional(),
    publishAt: z.string().datetime().optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    status: z.enum(["PLANNED", "SCHEDULED", "PUBLISHED", "ISSUE"]).optional(),
    issueReason: z.string().trim().min(3).max(500).optional()
  })
  .superRefine((value, context) => {
    if (value.status === "ISSUE" && !value.issueReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "issueReason is required when status is ISSUE",
        path: ["issueReason"]
      });
    }
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  publicationId: z.string().uuid()
});

class PublicationController {
  async create(request, response) {
    const payload = createPublicationSchema.parse(request.body);
    const publication = await publicationService.create(request.auth.sub, payload);

    response.status(201).json(publication);
  }

  async list(request, response) {
    const filters = listPublicationSchema.parse(request.query);
    const publications = await publicationService.list(filters);

    response.status(200).json(publications);
  }

  async update(request, response) {
    const { publicationId } = paramsSchema.parse(request.params);
    const payload = updatePublicationSchema.parse(request.body);
    const publication = await publicationService.update(request.auth.sub, publicationId, payload);

    response.status(200).json(publication);
  }
}

export const publicationController = new PublicationController();

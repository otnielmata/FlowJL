import { z } from "zod";

import { copywritingService } from "../services/copywriting.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const copywritingFormatSchema = z.enum(["REEL", "CAROUSEL", "STORIES", "EMAIL", "YOUTUBE", "ADS", "LANDING_PAGE"]);

const generateCopywritingSchema = z.object({
  format: copywritingFormatSchema,
  objective: z.string().trim().min(8).max(180),
  briefing: z.string().trim().min(20).max(4000)
});

const saveCopywritingSchema = z.object({
  launchId: z.string().uuid(),
  format: copywritingFormatSchema,
  objective: z.string().trim().min(8).max(180),
  briefing: z.string().trim().min(20).max(4000),
  headline: z.string().trim().min(8).max(240),
  hook: z.string().trim().min(8).max(500),
  bodySections: z
    .array(
      z.object({
        label: z.string().trim().min(3).max(80),
        content: z.string().trim().min(8).max(2000)
      })
    )
    .min(1)
    .max(10),
  cta: z.string().trim().min(3).max(240),
  reviewNotes: z.array(z.string().trim().min(3).max(240)).max(10).optional().default([]),
  sourceContext: z.object({
    launchId: z.string().uuid(),
    launchName: z.string().trim().min(3).max(180),
    product: z.string().trim().min(3).max(180),
    expert: z.string().trim().min(3).max(180),
    offerVersion: z.number().int().nullable(),
    positioningVersion: z.number().int().nullable(),
    editorialLineVersion: z.number().int().nullable(),
    avatarVersion: z.number().int().nullable(),
    editorialPillars: z.array(z.string().trim().min(2).max(120)).max(10),
    languageCues: z.array(z.string().trim().min(2).max(120)).max(15)
  })
});

class CopywritingController {
  async generate(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = generateCopywritingSchema.parse(request.body);
    const copySuggestion = await copywritingService.generate(request.auth.sub, launchId, payload);

    response.status(200).json(copySuggestion);
  }

  async create(request, response) {
    const payload = saveCopywritingSchema.parse(request.body);
    const copywriting = await copywritingService.create(request.auth.sub, payload);

    response.status(201).json(copywriting);
  }
}

export const copywritingController = new CopywritingController();

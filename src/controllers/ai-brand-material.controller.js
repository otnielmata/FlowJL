import { z } from "zod";

import { aiBrandMaterialReviewStatuses, aiBrandMaterialTypes } from "../models/ai-brand-material.model.js";
import { aiBrandMaterialService } from "../services/ai-brand-material.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const materialParamsSchema = z.object({
  materialId: z.string().uuid()
});

const materialTypeSchema = z.enum(aiBrandMaterialTypes);
const reviewStatusSchema = z.enum(aiBrandMaterialReviewStatuses);

const generateMaterialSchema = z.object({
  materialType: materialTypeSchema,
  objective: z.string().trim().min(8).max(180),
  briefing: z.string().trim().min(30).max(5000)
});

const materialSectionSchema = z.object({
  label: z.string().trim().min(3).max(80),
  content: z.string().trim().min(8).max(3000)
});

const sourceContextSchema = z.object({
  launchId: z.string().uuid(),
  launchName: z.string().trim().min(3).max(180),
  product: z.string().trim().min(2).max(180),
  expert: z.string().trim().min(2).max(180),
  avatarVersion: z.number().int().nullable(),
  editorialLineVersion: z.number().int().nullable(),
  positioningVersion: z.number().int().nullable(),
  offerVersion: z.number().int().nullable(),
  editorialPillars: z.array(z.string().trim().min(2).max(120)).max(20),
  languageCues: z.array(z.string().trim().min(2).max(120)).max(20),
  brandSignals: z.array(z.string().trim().min(2).max(240)).max(20)
});

const saveMaterialSchema = z.object({
  launchId: z.string().uuid(),
  materialType: materialTypeSchema,
  objective: z.string().trim().min(8).max(180),
  briefing: z.string().trim().min(30).max(5000),
  title: z.string().trim().min(3).max(240),
  hook: z.string().trim().min(8).max(800),
  sections: z.array(materialSectionSchema).min(1).max(12),
  cta: z.string().trim().min(3).max(240),
  reviewNotes: z.array(z.string().trim().min(3).max(240)).max(20).optional().default([]),
  sourceContext: sourceContextSchema
});

const listMaterialSchema = z.object({
  launchId: z.string().uuid().optional(),
  materialType: materialTypeSchema.optional(),
  reviewStatus: reviewStatusSchema.optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

class AiBrandMaterialController {
  async generate(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = generateMaterialSchema.parse(request.body);
    const materialSuggestion = await aiBrandMaterialService.generate(request.auth.sub, launchId, payload);

    response.status(200).json(materialSuggestion);
  }

  async create(request, response) {
    const payload = saveMaterialSchema.parse(request.body);
    const material = await aiBrandMaterialService.create(request.auth.sub, payload);

    response.status(201).json(material);
  }

  async list(request, response) {
    const filters = listMaterialSchema.parse(request.query);
    const materials = await aiBrandMaterialService.list(filters);

    response.status(200).json(materials);
  }

  async getById(request, response) {
    const { materialId } = materialParamsSchema.parse(request.params);
    const material = await aiBrandMaterialService.getById(materialId);

    response.status(200).json(material);
  }
}

export const aiBrandMaterialController = new AiBrandMaterialController();

import { z } from "zod";

import { assetLibraryService } from "../services/asset-library.service.js";

const createAssetSchema = z.object({
  launchId: z.string().uuid().optional(),
  name: z.string().trim().min(3).max(180),
  type: z.string().trim().min(3).max(120),
  origin: z.string().trim().min(3).max(500),
  tags: z.array(z.string().trim().min(1).max(60)).min(1).max(20)
});

const listAssetsQuerySchema = z.object({
  launchId: z.string().uuid().optional(),
  type: z.string().trim().min(1).max(120).optional(),
  tag: z.string().trim().min(1).max(60).optional(),
  status: z.enum(["AVAILABLE", "ARCHIVED"]).optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const paramsSchema = z.object({
  assetId: z.string().uuid()
});

class AssetLibraryController {
  async create(request, response) {
    const payload = createAssetSchema.parse(request.body);
    const asset = await assetLibraryService.create(request.auth.sub, payload);

    response.status(201).json(asset);
  }

  async list(request, response) {
    const filters = listAssetsQuerySchema.parse(request.query);
    const assets = await assetLibraryService.list(filters);

    response.status(200).json(assets);
  }

  async deactivate(request, response) {
    const { assetId } = paramsSchema.parse(request.params);
    const asset = await assetLibraryService.deactivate(request.auth.sub, assetId);

    response.status(200).json(asset);
  }
}

export const assetLibraryController = new AssetLibraryController();

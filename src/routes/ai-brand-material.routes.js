import { Router } from "express";

import { aiBrandMaterialController } from "../controllers/ai-brand-material.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const aiBrandMaterialRoutes = Router();

aiBrandMaterialRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("AI_BRAND_MATERIAL_CREATE")),
  asyncHandler(aiBrandMaterialController.create.bind(aiBrandMaterialController))
);
aiBrandMaterialRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("AI_BRAND_MATERIAL_READ")),
  asyncHandler(aiBrandMaterialController.list.bind(aiBrandMaterialController))
);
aiBrandMaterialRoutes.get(
  "/:materialId",
  authMiddleware,
  asyncHandler(requirePermission("AI_BRAND_MATERIAL_READ")),
  asyncHandler(aiBrandMaterialController.getById.bind(aiBrandMaterialController))
);

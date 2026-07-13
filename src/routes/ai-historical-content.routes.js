import { Router } from "express";

import { aiHistoricalContentController } from "../controllers/ai-historical-content.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const aiHistoricalContentRoutes = Router();

aiHistoricalContentRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("AI_HISTORICAL_CONTENT_CREATE")),
  asyncHandler(aiHistoricalContentController.create.bind(aiHistoricalContentController))
);
aiHistoricalContentRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("AI_HISTORICAL_CONTENT_READ")),
  asyncHandler(aiHistoricalContentController.list.bind(aiHistoricalContentController))
);
aiHistoricalContentRoutes.post(
  "/recommendations",
  authMiddleware,
  asyncHandler(requirePermission("AI_HISTORICAL_CONTENT_RECOMMEND")),
  asyncHandler(aiHistoricalContentController.recommend.bind(aiHistoricalContentController))
);
aiHistoricalContentRoutes.get(
  "/:contentId",
  authMiddleware,
  asyncHandler(requirePermission("AI_HISTORICAL_CONTENT_READ")),
  asyncHandler(aiHistoricalContentController.getById.bind(aiHistoricalContentController))
);
aiHistoricalContentRoutes.delete(
  "/:contentId",
  authMiddleware,
  asyncHandler(requirePermission("AI_HISTORICAL_CONTENT_DEACTIVATE")),
  asyncHandler(aiHistoricalContentController.deactivate.bind(aiHistoricalContentController))
);

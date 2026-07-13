import { Router } from "express";

import { aiMetricInsightController } from "../controllers/ai-metric-insight.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const aiMetricInsightRoutes = Router();

aiMetricInsightRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("AI_METRIC_INSIGHT_GENERATE")),
  asyncHandler(aiMetricInsightController.generate.bind(aiMetricInsightController))
);
aiMetricInsightRoutes.get(
  "/:insightId",
  authMiddleware,
  asyncHandler(requirePermission("AI_METRIC_INSIGHT_READ")),
  asyncHandler(aiMetricInsightController.getById.bind(aiMetricInsightController))
);

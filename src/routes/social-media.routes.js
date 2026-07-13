import { Router } from "express";

import { socialMediaController } from "../controllers/social-media.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const socialMediaRoutes = Router();

socialMediaRoutes.get("/", authMiddleware, asyncHandler(requirePermission("SOCIAL_MEDIA_READ")), asyncHandler(socialMediaController.list.bind(socialMediaController)));
socialMediaRoutes.post("/publications", authMiddleware, asyncHandler(requirePermission("SOCIAL_MEDIA_SCHEDULE")), asyncHandler(socialMediaController.schedulePublication.bind(socialMediaController)));
socialMediaRoutes.put("/publications/:publicationId/performance", authMiddleware, asyncHandler(requirePermission("SOCIAL_MEDIA_METRICS_UPDATE")), asyncHandler(socialMediaController.recordPerformance.bind(socialMediaController)));

import { Router } from "express";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { youtubeContentController } from "../controllers/youtube-content.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const youtubeContentRoutes = Router();

youtubeContentRoutes.post("/", authMiddleware, asyncHandler(requirePermission("YOUTUBE_CONTENT_CREATE")), asyncHandler(youtubeContentController.create.bind(youtubeContentController)));
youtubeContentRoutes.put("/:contentId", authMiddleware, asyncHandler(requirePermission("YOUTUBE_CONTENT_UPDATE")), asyncHandler(youtubeContentController.update.bind(youtubeContentController)));
youtubeContentRoutes.delete("/:contentId", authMiddleware, asyncHandler(requirePermission("YOUTUBE_CONTENT_DEACTIVATE")), asyncHandler(youtubeContentController.deactivate.bind(youtubeContentController)));

import { Router } from "express";

import { contentStatusController } from "../controllers/content-status.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const contentStatusRoutes = Router();

contentStatusRoutes.post(
  "/:contentType/:contentId",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_STATUS_UPDATE")),
  asyncHandler(contentStatusController.changeStatus.bind(contentStatusController))
);
contentStatusRoutes.get(
  "/:contentType/:contentId/history",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_STATUS_READ")),
  asyncHandler(contentStatusController.listHistory.bind(contentStatusController))
);

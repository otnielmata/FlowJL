import { Router } from "express";

import { contentProductionController } from "../controllers/content-production.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const contentProductionRoutes = Router();

contentProductionRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_PRODUCTION_CREATE")),
  asyncHandler(contentProductionController.create.bind(contentProductionController))
);
contentProductionRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_PRODUCTION_READ")),
  asyncHandler(contentProductionController.list.bind(contentProductionController))
);
contentProductionRoutes.get(
  "/:contentId",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_PRODUCTION_READ")),
  asyncHandler(contentProductionController.getById.bind(contentProductionController))
);
contentProductionRoutes.put(
  "/:contentId",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_PRODUCTION_UPDATE")),
  asyncHandler(contentProductionController.update.bind(contentProductionController))
);
contentProductionRoutes.post(
  "/:contentId/actions",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_PRODUCTION_ACTION")),
  asyncHandler(contentProductionController.runAction.bind(contentProductionController))
);

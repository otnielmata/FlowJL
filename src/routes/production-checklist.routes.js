import { Router } from "express";

import { productionChecklistController } from "../controllers/production-checklist.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const productionChecklistRoutes = Router();

productionChecklistRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("PRODUCTION_CHECKLIST_CREATE")),
  asyncHandler(productionChecklistController.create.bind(productionChecklistController))
);
productionChecklistRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("PRODUCTION_CHECKLIST_READ")),
  asyncHandler(productionChecklistController.list.bind(productionChecklistController))
);
productionChecklistRoutes.put(
  "/:checklistId",
  authMiddleware,
  asyncHandler(requirePermission("PRODUCTION_CHECKLIST_UPDATE")),
  asyncHandler(productionChecklistController.update.bind(productionChecklistController))
);
productionChecklistRoutes.post(
  "/:checklistId/reopen",
  authMiddleware,
  asyncHandler(requirePermission("PRODUCTION_CHECKLIST_REOPEN")),
  asyncHandler(productionChecklistController.reopen.bind(productionChecklistController))
);

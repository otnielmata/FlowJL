import { Router } from "express";

import { operationalChecklistController } from "../controllers/operational-checklist.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const operationalChecklistRoutes = Router();

operationalChecklistRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_CHECKLIST_CREATE")),
  asyncHandler(operationalChecklistController.create.bind(operationalChecklistController))
);
operationalChecklistRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_CHECKLIST_READ")),
  asyncHandler(operationalChecklistController.list.bind(operationalChecklistController))
);
operationalChecklistRoutes.get(
  "/:checklistId",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_CHECKLIST_READ")),
  asyncHandler(operationalChecklistController.getById.bind(operationalChecklistController))
);
operationalChecklistRoutes.put(
  "/:checklistId",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_CHECKLIST_UPDATE")),
  asyncHandler(operationalChecklistController.update.bind(operationalChecklistController))
);
operationalChecklistRoutes.post(
  "/:checklistId/complete",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_CHECKLIST_UPDATE")),
  asyncHandler(operationalChecklistController.complete.bind(operationalChecklistController))
);
operationalChecklistRoutes.delete(
  "/:checklistId",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_CHECKLIST_DEACTIVATE")),
  asyncHandler(operationalChecklistController.deactivate.bind(operationalChecklistController))
);

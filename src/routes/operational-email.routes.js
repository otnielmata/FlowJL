import { Router } from "express";

import { operationalEmailController } from "../controllers/operational-email.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const operationalEmailRoutes = Router();

operationalEmailRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_EMAIL_CREATE")),
  asyncHandler(operationalEmailController.create.bind(operationalEmailController))
);
operationalEmailRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_EMAIL_READ")),
  asyncHandler(operationalEmailController.list.bind(operationalEmailController))
);
operationalEmailRoutes.put(
  "/:emailActionId",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_EMAIL_UPDATE")),
  asyncHandler(operationalEmailController.update.bind(operationalEmailController))
);
operationalEmailRoutes.delete(
  "/:emailActionId",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_EMAIL_DEACTIVATE")),
  asyncHandler(operationalEmailController.deactivate.bind(operationalEmailController))
);

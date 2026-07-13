import { Router } from "express";

import { operationsManagementController } from "../controllers/operations-management.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const operationsManagementRoutes = Router();

operationsManagementRoutes.get(
  "/activities",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_SCHEDULE_READ")),
  asyncHandler(operationsManagementController.list.bind(operationsManagementController))
);
operationsManagementRoutes.post(
  "/activities",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_SCHEDULE_CREATE")),
  asyncHandler(operationsManagementController.create.bind(operationsManagementController))
);
operationsManagementRoutes.put(
  "/activities/:activityId",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_SCHEDULE_UPDATE")),
  asyncHandler(operationsManagementController.update.bind(operationsManagementController))
);
operationsManagementRoutes.post(
  "/activities/:activityId/execution",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_SCHEDULE_UPDATE")),
  asyncHandler(operationsManagementController.recordExecution.bind(operationsManagementController))
);

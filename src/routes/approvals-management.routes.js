import { Router } from "express";

import { approvalsManagementController } from "../controllers/approvals-management.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const approvalsManagementRoutes = Router();

approvalsManagementRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("APPROVALS_MANAGEMENT_READ")),
  asyncHandler(approvalsManagementController.list.bind(approvalsManagementController))
);
approvalsManagementRoutes.get(
  "/:approvalType/:approvalId",
  authMiddleware,
  asyncHandler(requirePermission("APPROVALS_MANAGEMENT_READ")),
  asyncHandler(approvalsManagementController.getById.bind(approvalsManagementController))
);
approvalsManagementRoutes.post(
  "/:approvalType/:approvalId/decision",
  authMiddleware,
  asyncHandler(requirePermission("APPROVALS_MANAGEMENT_DECIDE")),
  asyncHandler(approvalsManagementController.decide.bind(approvalsManagementController))
);

import { Router } from "express";

import { dashboardController } from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const dashboardRoutes = Router();

dashboardRoutes.get(
  "/strategist",
  authMiddleware,
  asyncHandler(requirePermission("STRATEGIST_DASHBOARD_READ")),
  asyncHandler(dashboardController.getStrategistDashboard.bind(dashboardController))
);

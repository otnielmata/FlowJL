import { Router } from "express";

import { dashboardController } from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const dashboardRoutes = Router();

dashboardRoutes.get(
  "/overview",
  authMiddleware,
  asyncHandler(requirePermission("DASHBOARD_OVERVIEW_READ")),
  asyncHandler(dashboardController.getOverview.bind(dashboardController))
);

dashboardRoutes.get(
  "/strategist",
  authMiddleware,
  asyncHandler(requirePermission("STRATEGIST_DASHBOARD_READ")),
  asyncHandler(dashboardController.getStrategistDashboard.bind(dashboardController))
);

dashboardRoutes.get(
  "/notifications",
  authMiddleware,
  asyncHandler(requirePermission("DASHBOARD_OVERVIEW_READ")),
  asyncHandler(dashboardController.listNotifications.bind(dashboardController))
);

dashboardRoutes.patch(
  "/notifications/read-all",
  authMiddleware,
  asyncHandler(requirePermission("DASHBOARD_OVERVIEW_READ")),
  asyncHandler(dashboardController.markAllNotificationsAsRead.bind(dashboardController))
);

dashboardRoutes.patch(
  "/notifications/:notificationId/read",
  authMiddleware,
  asyncHandler(requirePermission("DASHBOARD_OVERVIEW_READ")),
  asyncHandler(dashboardController.markNotificationAsRead.bind(dashboardController))
);

dashboardRoutes.get(
  "/search",
  authMiddleware,
  asyncHandler(requirePermission("DASHBOARD_OVERVIEW_READ")),
  asyncHandler(dashboardController.search.bind(dashboardController))
);

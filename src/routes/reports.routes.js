import { Router } from "express";

import { reportsController } from "../controllers/reports.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const reportsRoutes = Router();

reportsRoutes.get(
  "/analytics",
  authMiddleware,
  asyncHandler(requirePermission("REPORTS_READ")),
  asyncHandler(reportsController.getAnalytics.bind(reportsController))
);

reportsRoutes.post(
  "/exports",
  authMiddleware,
  asyncHandler(requirePermission("REPORTS_EXPORT")),
  asyncHandler(reportsController.exportAnalysis.bind(reportsController))
);

reportsRoutes.get(
  "/views",
  authMiddleware,
  asyncHandler(requirePermission("REPORTS_READ")),
  asyncHandler(reportsController.listViews.bind(reportsController))
);

reportsRoutes.post(
  "/views",
  authMiddleware,
  asyncHandler(requirePermission("REPORTS_SAVE_VIEW")),
  asyncHandler(reportsController.saveView.bind(reportsController))
);

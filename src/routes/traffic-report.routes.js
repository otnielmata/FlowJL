import { Router } from "express";

import { trafficReportController } from "../controllers/traffic-report.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const trafficReportRoutes = Router();

trafficReportRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_REPORT_READ")),
  asyncHandler(trafficReportController.getReport.bind(trafficReportController))
);

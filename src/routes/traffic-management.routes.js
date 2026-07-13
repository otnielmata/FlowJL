import { Router } from "express";

import { trafficManagementController } from "../controllers/traffic-management.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const trafficManagementRoutes = Router();

trafficManagementRoutes.get(
  "/campaigns",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CAMPAIGN_READ")),
  asyncHandler(trafficManagementController.listCampaigns.bind(trafficManagementController))
);
trafficManagementRoutes.post(
  "/campaigns",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CAMPAIGN_CREATE")),
  asyncHandler(trafficManagementController.createCampaign.bind(trafficManagementController))
);
trafficManagementRoutes.put(
  "/campaigns/:campaignId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CAMPAIGN_UPDATE")),
  asyncHandler(trafficManagementController.updateCampaign.bind(trafficManagementController))
);
trafficManagementRoutes.get(
  "/dashboard",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_REPORT_READ")),
  asyncHandler(trafficManagementController.getDashboard.bind(trafficManagementController))
);
trafficManagementRoutes.post(
  "/compare",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_REPORT_READ")),
  asyncHandler(trafficManagementController.compareCampaigns.bind(trafficManagementController))
);
trafficManagementRoutes.post(
  "/campaigns/:campaignId/actions",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CAMPAIGN_UPDATE")),
  asyncHandler(trafficManagementController.runAction.bind(trafficManagementController))
);

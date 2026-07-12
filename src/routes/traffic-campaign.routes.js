import { Router } from "express";

import { trafficCampaignController } from "../controllers/traffic-campaign.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const trafficCampaignRoutes = Router();

trafficCampaignRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CAMPAIGN_CREATE")),
  asyncHandler(trafficCampaignController.create.bind(trafficCampaignController))
);
trafficCampaignRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CAMPAIGN_READ")),
  asyncHandler(trafficCampaignController.list.bind(trafficCampaignController))
);
trafficCampaignRoutes.put(
  "/:campaignId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CAMPAIGN_UPDATE")),
  asyncHandler(trafficCampaignController.update.bind(trafficCampaignController))
);
trafficCampaignRoutes.delete(
  "/:campaignId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CAMPAIGN_DEACTIVATE")),
  asyncHandler(trafficCampaignController.deactivate.bind(trafficCampaignController))
);

import { Router } from "express";

import { emailCampaignController } from "../controllers/email-campaign.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const emailCampaignRoutes = Router();

emailCampaignRoutes.post("/", authMiddleware, asyncHandler(requirePermission("EMAIL_CAMPAIGN_CREATE")), asyncHandler(emailCampaignController.create.bind(emailCampaignController)));
emailCampaignRoutes.get("/", authMiddleware, asyncHandler(requirePermission("EMAIL_CAMPAIGN_READ")), asyncHandler(emailCampaignController.list.bind(emailCampaignController)));
emailCampaignRoutes.delete(
  "/:emailId",
  authMiddleware,
  asyncHandler(requirePermission("EMAIL_CAMPAIGN_DEACTIVATE")),
  asyncHandler(emailCampaignController.deactivate.bind(emailCampaignController))
);

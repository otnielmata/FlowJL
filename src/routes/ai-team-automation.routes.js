import { Router } from "express";

import { aiTeamAutomationController } from "../controllers/ai-team-automation.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const aiTeamAutomationRoutes = Router();

aiTeamAutomationRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("AI_TEAM_AUTOMATION_CREATE")),
  asyncHandler(aiTeamAutomationController.create.bind(aiTeamAutomationController))
);
aiTeamAutomationRoutes.get(
  "/:automationId",
  authMiddleware,
  asyncHandler(requirePermission("AI_TEAM_AUTOMATION_READ")),
  asyncHandler(aiTeamAutomationController.getById.bind(aiTeamAutomationController))
);
aiTeamAutomationRoutes.patch(
  "/:automationId/active",
  authMiddleware,
  asyncHandler(requirePermission("AI_TEAM_AUTOMATION_UPDATE")),
  asyncHandler(aiTeamAutomationController.setActive.bind(aiTeamAutomationController))
);
aiTeamAutomationRoutes.post(
  "/:automationId/execute",
  authMiddleware,
  asyncHandler(requirePermission("AI_TEAM_AUTOMATION_EXECUTE")),
  asyncHandler(aiTeamAutomationController.execute.bind(aiTeamAutomationController))
);

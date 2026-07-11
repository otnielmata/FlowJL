import { Router } from "express";

import { competitorResearchController } from "../controllers/competitor-research.controller.js";
import { launchController } from "../controllers/launch.controller.js";
import { marketResearchController } from "../controllers/market-research.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const launchRoutes = Router();

launchRoutes.post("/", authMiddleware, asyncHandler(requirePermission("LAUNCH_CREATE")), asyncHandler(launchController.create.bind(launchController)));
launchRoutes.get("/:launchId", authMiddleware, asyncHandler(requirePermission("LAUNCH_READ")), asyncHandler(launchController.getById.bind(launchController)));
launchRoutes.post(
  "/:launchId/market-researches",
  authMiddleware,
  asyncHandler(requirePermission("MARKET_RESEARCH_CREATE")),
  asyncHandler(marketResearchController.create.bind(marketResearchController))
);
launchRoutes.post(
  "/:launchId/competitor-researches",
  authMiddleware,
  asyncHandler(requirePermission("COMPETITOR_RESEARCH_CREATE")),
  asyncHandler(competitorResearchController.create.bind(competitorResearchController))
);

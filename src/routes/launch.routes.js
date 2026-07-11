import { Router } from "express";

import { avatarController } from "../controllers/avatar.controller.js";
import { competitorResearchController } from "../controllers/competitor-research.controller.js";
import { launchController } from "../controllers/launch.controller.js";
import { marketResearchController } from "../controllers/market-research.controller.js";
import { offerController } from "../controllers/offer.controller.js";
import { positioningController } from "../controllers/positioning.controller.js";
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
launchRoutes.post("/:launchId/avatars", authMiddleware, asyncHandler(requirePermission("AVATAR_CREATE")), asyncHandler(avatarController.create.bind(avatarController)));
launchRoutes.put("/:launchId/avatars", authMiddleware, asyncHandler(requirePermission("AVATAR_UPDATE")), asyncHandler(avatarController.update.bind(avatarController)));
launchRoutes.post(
  "/:launchId/avatar-suggestions",
  authMiddleware,
  asyncHandler(requirePermission("AVATAR_SUGGEST")),
  asyncHandler(avatarController.suggest.bind(avatarController))
);
launchRoutes.post("/:launchId/offers", authMiddleware, asyncHandler(requirePermission("OFFER_CREATE")), asyncHandler(offerController.create.bind(offerController)));
launchRoutes.put("/:launchId/offers", authMiddleware, asyncHandler(requirePermission("OFFER_UPDATE")), asyncHandler(offerController.update.bind(offerController)));
launchRoutes.post(
  "/:launchId/positionings",
  authMiddleware,
  asyncHandler(requirePermission("POSITIONING_CREATE")),
  asyncHandler(positioningController.create.bind(positioningController))
);
launchRoutes.put(
  "/:launchId/positionings",
  authMiddleware,
  asyncHandler(requirePermission("POSITIONING_UPDATE")),
  asyncHandler(positioningController.update.bind(positioningController))
);

import { Router } from "express";

import { avatarController } from "../controllers/avatar.controller.js";
import { competitorResearchController } from "../controllers/competitor-research.controller.js";
import { contentPlanController } from "../controllers/content-plan.controller.js";
import { copywritingController } from "../controllers/copywriting.controller.js";
import { editorialLineController } from "../controllers/editorial-line.controller.js";
import { expertApprovalController } from "../controllers/expert-approval.controller.js";
import { launchController } from "../controllers/launch.controller.js";
import { marketResearchController } from "../controllers/market-research.controller.js";
import { offerController } from "../controllers/offer.controller.js";
import { positioningController } from "../controllers/positioning.controller.js";
import { smartScheduleController } from "../controllers/smart-schedule.controller.js";
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
  "/:launchId/copywritings/generate",
  authMiddleware,
  asyncHandler(requirePermission("COPYWRITING_GENERATE")),
  asyncHandler(copywritingController.generate.bind(copywritingController))
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
launchRoutes.post(
  "/:launchId/editorial-lines",
  authMiddleware,
  asyncHandler(requirePermission("EDITORIAL_LINE_CREATE")),
  asyncHandler(editorialLineController.create.bind(editorialLineController))
);
launchRoutes.put(
  "/:launchId/editorial-lines",
  authMiddleware,
  asyncHandler(requirePermission("EDITORIAL_LINE_UPDATE")),
  asyncHandler(editorialLineController.update.bind(editorialLineController))
);
launchRoutes.post(
  "/:launchId/content-plans",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_PLAN_CREATE")),
  asyncHandler(contentPlanController.create.bind(contentPlanController))
);
launchRoutes.put(
  "/:launchId/content-plans",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_PLAN_UPDATE")),
  asyncHandler(contentPlanController.update.bind(contentPlanController))
);
launchRoutes.post(
  "/:launchId/smart-schedules",
  authMiddleware,
  asyncHandler(requirePermission("SMART_SCHEDULE_CREATE")),
  asyncHandler(smartScheduleController.create.bind(smartScheduleController))
);
launchRoutes.put(
  "/:launchId/smart-schedules",
  authMiddleware,
  asyncHandler(requirePermission("SMART_SCHEDULE_UPDATE")),
  asyncHandler(smartScheduleController.update.bind(smartScheduleController))
);
launchRoutes.post(
  "/:launchId/expert-approvals",
  authMiddleware,
  asyncHandler(requirePermission("EXPERT_APPROVAL_SUBMIT")),
  asyncHandler(expertApprovalController.submit.bind(expertApprovalController))
);
launchRoutes.post(
  "/:launchId/expert-approvals/decision",
  authMiddleware,
  asyncHandler(requirePermission("EXPERT_APPROVAL_DECIDE")),
  asyncHandler(expertApprovalController.decide.bind(expertApprovalController))
);

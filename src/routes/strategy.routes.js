import { Router } from "express";

import { strategyController } from "../controllers/strategy.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const strategyRoutes = Router();

strategyRoutes.get("/", authMiddleware, asyncHandler(requirePermission("STRATEGY_READ")), asyncHandler(strategyController.list.bind(strategyController)));
strategyRoutes.post("/", authMiddleware, asyncHandler(requirePermission("STRATEGY_CREATE")), asyncHandler(strategyController.create.bind(strategyController)));
strategyRoutes.get("/:strategyId", authMiddleware, asyncHandler(requirePermission("STRATEGY_READ")), asyncHandler(strategyController.getById.bind(strategyController)));
strategyRoutes.patch("/:strategyId/draft", authMiddleware, asyncHandler(requirePermission("STRATEGY_UPDATE")), asyncHandler(strategyController.saveDraft.bind(strategyController)));
strategyRoutes.post("/:strategyId/comments", authMiddleware, asyncHandler(requirePermission("STRATEGY_UPDATE")), asyncHandler(strategyController.addComment.bind(strategyController)));
strategyRoutes.post("/:strategyId/duplicate", authMiddleware, asyncHandler(requirePermission("STRATEGY_DUPLICATE")), asyncHandler(strategyController.duplicate.bind(strategyController)));
strategyRoutes.patch("/:strategyId/archive", authMiddleware, asyncHandler(requirePermission("STRATEGY_ARCHIVE")), asyncHandler(strategyController.archive.bind(strategyController)));
strategyRoutes.post(
  "/:strategyId/submit-approval",
  authMiddleware,
  asyncHandler(requirePermission("STRATEGY_SUBMIT_APPROVAL")),
  asyncHandler(strategyController.submitForApproval.bind(strategyController))
);
strategyRoutes.post(
  "/:strategyId/generate-ai-content",
  authMiddleware,
  asyncHandler(requirePermission("STRATEGY_GENERATE_AI")),
  asyncHandler(strategyController.generateAiContent.bind(strategyController))
);

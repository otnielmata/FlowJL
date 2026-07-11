import { Router } from "express";

import { reelController } from "../controllers/reel.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const reelRoutes = Router();

reelRoutes.post("/", authMiddleware, asyncHandler(requirePermission("REEL_CREATE")), asyncHandler(reelController.create.bind(reelController)));
reelRoutes.put("/:reelId", authMiddleware, asyncHandler(requirePermission("REEL_UPDATE")), asyncHandler(reelController.update.bind(reelController)));

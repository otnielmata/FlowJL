import { Router } from "express";

import { launchController } from "../controllers/launch.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const launchRoutes = Router();

launchRoutes.post("/", authMiddleware, asyncHandler(requirePermission("LAUNCH_CREATE")), asyncHandler(launchController.create.bind(launchController)));

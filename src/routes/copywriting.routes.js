import { Router } from "express";

import { copywritingController } from "../controllers/copywriting.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const copywritingRoutes = Router();

copywritingRoutes.post("/", authMiddleware, asyncHandler(requirePermission("COPYWRITING_CREATE")), asyncHandler(copywritingController.create.bind(copywritingController)));

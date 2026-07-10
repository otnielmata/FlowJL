import { Router } from "express";

import { profileController } from "../controllers/profile.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const profileRoutes = Router();

profileRoutes.get("/", authMiddleware, asyncHandler(profileController.list.bind(profileController)));
profileRoutes.post("/", authMiddleware, asyncHandler(profileController.create.bind(profileController)));
profileRoutes.put("/:id", authMiddleware, asyncHandler(profileController.update.bind(profileController)));

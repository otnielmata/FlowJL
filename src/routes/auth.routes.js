import { Router } from "express";

import { authController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(authController.login.bind(authController)));
authRoutes.post("/refresh", asyncHandler(authController.refresh.bind(authController)));
authRoutes.post("/logout", asyncHandler(authController.logout.bind(authController)));
authRoutes.get("/me", authMiddleware, asyncHandler(authController.me.bind(authController)));

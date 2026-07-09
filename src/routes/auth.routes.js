import { Router } from "express";

import { authController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(authController.login.bind(authController)));

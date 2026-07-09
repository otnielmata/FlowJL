import { Router } from "express";

import { userController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const userRoutes = Router();

userRoutes.put("/:id", authMiddleware, asyncHandler(userController.update.bind(userController)));

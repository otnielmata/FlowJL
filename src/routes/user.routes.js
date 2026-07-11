import { Router } from "express";

import { userController } from "../controllers/user.controller.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const userRoutes = Router();

userRoutes.post("/bootstrap-admin", asyncHandler(userController.createBootstrapAdmin.bind(userController)));
userRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(adminMiddleware),
  asyncHandler(userController.createCollaborator.bind(userController))
);
userRoutes.put("/:id", authMiddleware, asyncHandler(userController.update.bind(userController)));

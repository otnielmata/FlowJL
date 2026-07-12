import { Router } from "express";

import { userController } from "../controllers/user.controller.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { requireUserUpdatePermission } from "../middleware/user-update-permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const userRoutes = Router();

userRoutes.post("/bootstrap-admin", asyncHandler(userController.createBootstrapAdmin.bind(userController)));
userRoutes.get("/me", authMiddleware, asyncHandler(userController.getAuthenticatedUser.bind(userController)));
userRoutes.get("/", authMiddleware, asyncHandler(requirePermission("USER_LIST")), asyncHandler(userController.list.bind(userController)));
userRoutes.get(
  "/:id",
  authMiddleware,
  asyncHandler(requirePermission("USER_READ")),
  asyncHandler(userController.getById.bind(userController))
);
userRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(adminMiddleware),
  asyncHandler(userController.createCollaborator.bind(userController))
);
userRoutes.put(
  "/:id",
  authMiddleware,
  asyncHandler(requireUserUpdatePermission),
  asyncHandler(userController.update.bind(userController))
);

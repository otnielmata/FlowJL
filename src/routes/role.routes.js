import { Router } from "express";

import { roleController } from "../controllers/role.controller.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const roleRoutes = Router();

roleRoutes.get("/", authMiddleware, asyncHandler(requirePermission("ROLE_READ")), asyncHandler(roleController.list.bind(roleController)));
roleRoutes.post("/", authMiddleware, asyncHandler(adminMiddleware), asyncHandler(roleController.create.bind(roleController)));
roleRoutes.put("/:code", authMiddleware, asyncHandler(adminMiddleware), asyncHandler(roleController.update.bind(roleController)));

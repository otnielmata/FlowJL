import { Router } from "express";

import { auditController } from "../controllers/audit.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const auditRoutes = Router();

auditRoutes.get("/", authMiddleware, asyncHandler(requirePermission("AUDIT_READ")), asyncHandler(auditController.list.bind(auditController)));

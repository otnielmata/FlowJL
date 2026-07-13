import { Router } from "express";

import { aiScheduleController } from "../controllers/ai-schedule.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const aiScheduleRoutes = Router();

aiScheduleRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("AI_SCHEDULE_CREATE")),
  asyncHandler(aiScheduleController.create.bind(aiScheduleController))
);
aiScheduleRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("AI_SCHEDULE_READ")),
  asyncHandler(aiScheduleController.list.bind(aiScheduleController))
);
aiScheduleRoutes.get(
  "/:scheduleId",
  authMiddleware,
  asyncHandler(requirePermission("AI_SCHEDULE_READ")),
  asyncHandler(aiScheduleController.getById.bind(aiScheduleController))
);

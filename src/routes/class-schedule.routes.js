import { Router } from "express";

import { classScheduleController } from "../controllers/class-schedule.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const classScheduleRoutes = Router();

classScheduleRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("CLASS_SCHEDULE_CREATE")),
  asyncHandler(classScheduleController.create.bind(classScheduleController))
);
classScheduleRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("CLASS_SCHEDULE_READ")),
  asyncHandler(classScheduleController.list.bind(classScheduleController))
);
classScheduleRoutes.put(
  "/:classScheduleId",
  authMiddleware,
  asyncHandler(requirePermission("CLASS_SCHEDULE_UPDATE")),
  asyncHandler(classScheduleController.update.bind(classScheduleController))
);
classScheduleRoutes.delete(
  "/:classScheduleId",
  authMiddleware,
  asyncHandler(requirePermission("CLASS_SCHEDULE_DEACTIVATE")),
  asyncHandler(classScheduleController.deactivate.bind(classScheduleController))
);

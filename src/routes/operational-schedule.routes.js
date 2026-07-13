import { Router } from "express";

import { operationalScheduleController } from "../controllers/operational-schedule.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const operationalScheduleRoutes = Router();

operationalScheduleRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_SCHEDULE_CREATE")),
  asyncHandler(operationalScheduleController.create.bind(operationalScheduleController))
);
operationalScheduleRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_SCHEDULE_READ")),
  asyncHandler(operationalScheduleController.list.bind(operationalScheduleController))
);
operationalScheduleRoutes.post(
  "/replan",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_SCHEDULE_REPLAN")),
  asyncHandler(operationalScheduleController.replan.bind(operationalScheduleController))
);
operationalScheduleRoutes.get(
  "/:activityId",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_SCHEDULE_READ")),
  asyncHandler(operationalScheduleController.getById.bind(operationalScheduleController))
);
operationalScheduleRoutes.put(
  "/:activityId",
  authMiddleware,
  asyncHandler(requirePermission("OPERATIONAL_SCHEDULE_UPDATE")),
  asyncHandler(operationalScheduleController.update.bind(operationalScheduleController))
);

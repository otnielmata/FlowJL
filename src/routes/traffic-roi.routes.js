import { Router } from "express";

import { trafficRoiController } from "../controllers/traffic-roi.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const trafficRoiRoutes = Router();

trafficRoiRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_ROI_READ")),
  asyncHandler(trafficRoiController.calculate.bind(trafficRoiController))
);

import { Router } from "express";

import { trafficCreativeController } from "../controllers/traffic-creative.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const trafficCreativeRoutes = Router();

trafficCreativeRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CREATIVE_CREATE")),
  asyncHandler(trafficCreativeController.create.bind(trafficCreativeController))
);
trafficCreativeRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CREATIVE_READ")),
  asyncHandler(trafficCreativeController.list.bind(trafficCreativeController))
);
trafficCreativeRoutes.put(
  "/:creativeId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CREATIVE_UPDATE")),
  asyncHandler(trafficCreativeController.update.bind(trafficCreativeController))
);
trafficCreativeRoutes.delete(
  "/:creativeId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CREATIVE_DEACTIVATE")),
  asyncHandler(trafficCreativeController.deactivate.bind(trafficCreativeController))
);

import { Router } from "express";

import { trafficPixelController } from "../controllers/traffic-pixel.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const trafficPixelRoutes = Router();

trafficPixelRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_PIXEL_CREATE")),
  asyncHandler(trafficPixelController.create.bind(trafficPixelController))
);
trafficPixelRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_PIXEL_READ")),
  asyncHandler(trafficPixelController.list.bind(trafficPixelController))
);
trafficPixelRoutes.put(
  "/:pixelId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_PIXEL_UPDATE")),
  asyncHandler(trafficPixelController.update.bind(trafficPixelController))
);
trafficPixelRoutes.put(
  "/:pixelId/links",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_PIXEL_LINK")),
  asyncHandler(trafficPixelController.updateLinks.bind(trafficPixelController))
);
trafficPixelRoutes.delete(
  "/:pixelId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_PIXEL_DEACTIVATE")),
  asyncHandler(trafficPixelController.deactivate.bind(trafficPixelController))
);

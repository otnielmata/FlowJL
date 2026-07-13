import { Router } from "express";

import { trafficConversionEventController } from "../controllers/traffic-conversion-event.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const trafficConversionEventRoutes = Router();

trafficConversionEventRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CONVERSION_EVENT_CREATE")),
  asyncHandler(trafficConversionEventController.create.bind(trafficConversionEventController))
);
trafficConversionEventRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CONVERSION_EVENT_READ")),
  asyncHandler(trafficConversionEventController.list.bind(trafficConversionEventController))
);
trafficConversionEventRoutes.put(
  "/:eventId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CONVERSION_EVENT_UPDATE")),
  asyncHandler(trafficConversionEventController.update.bind(trafficConversionEventController))
);
trafficConversionEventRoutes.put(
  "/:eventId/links",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CONVERSION_EVENT_LINK")),
  asyncHandler(trafficConversionEventController.updateLinks.bind(trafficConversionEventController))
);
trafficConversionEventRoutes.delete(
  "/:eventId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_CONVERSION_EVENT_DEACTIVATE")),
  asyncHandler(trafficConversionEventController.deactivate.bind(trafficConversionEventController))
);

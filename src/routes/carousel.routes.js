import { Router } from "express";

import { carouselController } from "../controllers/carousel.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const carouselRoutes = Router();

carouselRoutes.post("/", authMiddleware, asyncHandler(requirePermission("CAROUSEL_CREATE")), asyncHandler(carouselController.create.bind(carouselController)));
carouselRoutes.put("/:carouselId", authMiddleware, asyncHandler(requirePermission("CAROUSEL_UPDATE")), asyncHandler(carouselController.update.bind(carouselController)));

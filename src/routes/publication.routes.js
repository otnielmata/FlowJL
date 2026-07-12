import { Router } from "express";

import { publicationController } from "../controllers/publication.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const publicationRoutes = Router();

publicationRoutes.post("/", authMiddleware, asyncHandler(requirePermission("PUBLICATION_CREATE")), asyncHandler(publicationController.create.bind(publicationController)));
publicationRoutes.get("/", authMiddleware, asyncHandler(requirePermission("PUBLICATION_READ")), asyncHandler(publicationController.list.bind(publicationController)));
publicationRoutes.put("/:publicationId", authMiddleware, asyncHandler(requirePermission("PUBLICATION_UPDATE")), asyncHandler(publicationController.update.bind(publicationController)));

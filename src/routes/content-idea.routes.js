import { Router } from "express";

import { contentIdeaController } from "../controllers/content-idea.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const contentIdeaRoutes = Router();

contentIdeaRoutes.post("/", authMiddleware, asyncHandler(requirePermission("CONTENT_IDEA_CREATE")), asyncHandler(contentIdeaController.create.bind(contentIdeaController)));
contentIdeaRoutes.get("/", authMiddleware, asyncHandler(requirePermission("CONTENT_IDEA_READ")), asyncHandler(contentIdeaController.list.bind(contentIdeaController)));
contentIdeaRoutes.delete(
  "/:ideaId",
  authMiddleware,
  asyncHandler(requirePermission("CONTENT_IDEA_DEACTIVATE")),
  asyncHandler(contentIdeaController.deactivate.bind(contentIdeaController))
);

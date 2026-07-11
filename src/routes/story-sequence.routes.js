import { Router } from "express";

import { storySequenceController } from "../controllers/story-sequence.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const storySequenceRoutes = Router();

storySequenceRoutes.post("/", authMiddleware, asyncHandler(requirePermission("STORY_SEQUENCE_CREATE")), asyncHandler(storySequenceController.create.bind(storySequenceController)));
storySequenceRoutes.put("/:sequenceId", authMiddleware, asyncHandler(requirePermission("STORY_SEQUENCE_UPDATE")), asyncHandler(storySequenceController.update.bind(storySequenceController)));

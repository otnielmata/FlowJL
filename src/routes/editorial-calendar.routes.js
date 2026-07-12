import { Router } from "express";

import { editorialCalendarController } from "../controllers/editorial-calendar.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const editorialCalendarRoutes = Router();

editorialCalendarRoutes.post("/", authMiddleware, asyncHandler(requirePermission("EDITORIAL_CALENDAR_CREATE")), asyncHandler(editorialCalendarController.create.bind(editorialCalendarController)));
editorialCalendarRoutes.get("/", authMiddleware, asyncHandler(requirePermission("EDITORIAL_CALENDAR_READ")), asyncHandler(editorialCalendarController.list.bind(editorialCalendarController)));
editorialCalendarRoutes.put("/:itemId", authMiddleware, asyncHandler(requirePermission("EDITORIAL_CALENDAR_UPDATE")), asyncHandler(editorialCalendarController.update.bind(editorialCalendarController)));

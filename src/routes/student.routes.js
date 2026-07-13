import { Router } from "express";

import { studentController } from "../controllers/student.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const studentRoutes = Router();

studentRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("STUDENT_CREATE")),
  asyncHandler(studentController.create.bind(studentController))
);
studentRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("STUDENT_READ")),
  asyncHandler(studentController.list.bind(studentController))
);
studentRoutes.get(
  "/:studentId",
  authMiddleware,
  asyncHandler(requirePermission("STUDENT_READ")),
  asyncHandler(studentController.getById.bind(studentController))
);
studentRoutes.put(
  "/:studentId",
  authMiddleware,
  asyncHandler(requirePermission("STUDENT_UPDATE")),
  asyncHandler(studentController.update.bind(studentController))
);
studentRoutes.delete(
  "/:studentId",
  authMiddleware,
  asyncHandler(requirePermission("STUDENT_DEACTIVATE")),
  asyncHandler(studentController.deactivate.bind(studentController))
);

import { Router } from "express";

import { auditRoutes } from "./audit.routes.js";
import { authRoutes } from "./auth.routes.js";
import { profileRoutes } from "./profile.routes.js";
import { roleRoutes } from "./role.routes.js";
import { userRoutes } from "./user.routes.js";

export const apiRoutes = Router();

apiRoutes.get("/", (_request, response) => {
  response.status(200).json({
    service: "flow-jl-api",
    version: "v1",
    modules: ["audits", "auth", "profiles", "roles", "users", "swagger"]
  });
});

apiRoutes.use("/audits", auditRoutes);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/profiles", profileRoutes);
apiRoutes.use("/roles", roleRoutes);
apiRoutes.use("/users", userRoutes);

import { Router } from "express";

import { auditRoutes } from "./audit.routes.js";
import { authRoutes } from "./auth.routes.js";
import { carouselRoutes } from "./carousel.routes.js";
import { contentIdeaRoutes } from "./content-idea.routes.js";
import { launchRoutes } from "./launch.routes.js";
import { profileRoutes } from "./profile.routes.js";
import { reelRoutes } from "./reel.routes.js";
import { roleRoutes } from "./role.routes.js";
import { storySequenceRoutes } from "./story-sequence.routes.js";
import { userRoutes } from "./user.routes.js";

export const apiRoutes = Router();

apiRoutes.get("/", (_request, response) => {
  response.status(200).json({
    service: "flow-jl-api",
    version: "v1",
    modules: ["audits", "auth", "carousels", "content-ideas", "launches", "profiles", "reels", "roles", "stories", "users", "swagger"]
  });
});

apiRoutes.use("/audits", auditRoutes);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/carousels", carouselRoutes);
apiRoutes.use("/content-ideas", contentIdeaRoutes);
apiRoutes.use("/launches", launchRoutes);
apiRoutes.use("/profiles", profileRoutes);
apiRoutes.use("/reels", reelRoutes);
apiRoutes.use("/roles", roleRoutes);
apiRoutes.use("/stories", storySequenceRoutes);
apiRoutes.use("/users", userRoutes);

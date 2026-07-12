import { Router } from "express";

import { auditRoutes } from "./audit.routes.js";
import { assetLibraryRoutes } from "./asset-library.routes.js";
import { authRoutes } from "./auth.routes.js";
import { carouselRoutes } from "./carousel.routes.js";
import { contentApprovalRoutes } from "./content-approval.routes.js";
import { copywritingRoutes } from "./copywriting.routes.js";
import { contentIdeaRoutes } from "./content-idea.routes.js";
import { dashboardRoutes } from "./dashboard.routes.js";
import { emailCampaignRoutes } from "./email-campaign.routes.js";
import { launchRoutes } from "./launch.routes.js";
import { profileRoutes } from "./profile.routes.js";
import { reelRoutes } from "./reel.routes.js";
import { roleRoutes } from "./role.routes.js";
import { storySequenceRoutes } from "./story-sequence.routes.js";
import { youtubeContentRoutes } from "./youtube-content.routes.js";
import { userRoutes } from "./user.routes.js";

export const apiRoutes = Router();

apiRoutes.get("/", (_request, response) => {
  response.status(200).json({
    service: "flow-jl-api",
    version: "v1",
    modules: ["assets", "audits", "auth", "carousels", "content-approvals", "content-ideas", "copywritings", "dashboards", "emails", "launches", "profiles", "reels", "roles", "stories", "users", "youtube-contents", "swagger"]
  });
});

apiRoutes.use("/assets", assetLibraryRoutes);
apiRoutes.use("/audits", auditRoutes);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/carousels", carouselRoutes);
apiRoutes.use("/content-approvals", contentApprovalRoutes);
apiRoutes.use("/copywritings", copywritingRoutes);
apiRoutes.use("/content-ideas", contentIdeaRoutes);
apiRoutes.use("/dashboards", dashboardRoutes);
apiRoutes.use("/emails", emailCampaignRoutes);
apiRoutes.use("/launches", launchRoutes);
apiRoutes.use("/profiles", profileRoutes);
apiRoutes.use("/reels", reelRoutes);
apiRoutes.use("/roles", roleRoutes);
apiRoutes.use("/stories", storySequenceRoutes);
apiRoutes.use("/youtube-contents", youtubeContentRoutes);
apiRoutes.use("/users", userRoutes);

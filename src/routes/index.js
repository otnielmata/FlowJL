import { Router } from "express";

import { auditRoutes } from "./audit.routes.js";
import { assetLibraryRoutes } from "./asset-library.routes.js";
import { authRoutes } from "./auth.routes.js";
import { carouselRoutes } from "./carousel.routes.js";
import { classScheduleRoutes } from "./class-schedule.routes.js";
import { contentApprovalRoutes } from "./content-approval.routes.js";
import { copywritingRoutes } from "./copywriting.routes.js";
import { contentStatusRoutes } from "./content-status.routes.js";
import { contentIdeaRoutes } from "./content-idea.routes.js";
import { dashboardRoutes } from "./dashboard.routes.js";
import { discordOperationRoutes } from "./discord-operation.routes.js";
import { editorialCalendarRoutes } from "./editorial-calendar.routes.js";
import { emailCampaignRoutes } from "./email-campaign.routes.js";
import { externalIntegrationRoutes } from "./external-integration.routes.js";
import { launchRoutes } from "./launch.routes.js";
import { liveEventRoutes } from "./live-event.routes.js";
import { operationalEmailRoutes } from "./operational-email.routes.js";
import { profileRoutes } from "./profile.routes.js";
import { publicationRoutes } from "./publication.routes.js";
import { productionChecklistRoutes } from "./production-checklist.routes.js";
import { reelRoutes } from "./reel.routes.js";
import { roleRoutes } from "./role.routes.js";
import { storySequenceRoutes } from "./story-sequence.routes.js";
import { studentRoutes } from "./student.routes.js";
import { trafficAudienceRoutes } from "./traffic-audience.routes.js";
import { trafficCampaignRoutes } from "./traffic-campaign.routes.js";
import { trafficConversionEventRoutes } from "./traffic-conversion-event.routes.js";
import { trafficCreativeRoutes } from "./traffic-creative.routes.js";
import { trafficPixelRoutes } from "./traffic-pixel.routes.js";
import { trafficReportRoutes } from "./traffic-report.routes.js";
import { trafficRoiRoutes } from "./traffic-roi.routes.js";
import { youtubeContentRoutes } from "./youtube-content.routes.js";
import { userRoutes } from "./user.routes.js";

export const apiRoutes = Router();

apiRoutes.get("/", (_request, response) => {
  response.status(200).json({
    service: "flow-jl-api",
    version: "v1",
    modules: ["assets", "audits", "auth", "carousels", "class-schedules", "content-approvals", "content-ideas", "content-statuses", "copywritings", "dashboards", "discord-operations", "editorial-calendar", "emails", "external-publication", "launches", "live-events", "operational-emails", "production-checklists", "profiles", "publications", "reels", "roles", "stories", "students", "traffic-audiences", "traffic-campaigns", "traffic-conversion-events", "traffic-creatives", "traffic-pixels", "traffic-reports", "traffic-roi", "users", "youtube-contents", "swagger"]
  });
});

apiRoutes.use("/assets", assetLibraryRoutes);
apiRoutes.use("/audits", auditRoutes);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/carousels", carouselRoutes);
apiRoutes.use("/class-schedules", classScheduleRoutes);
apiRoutes.use("/content-approvals", contentApprovalRoutes);
apiRoutes.use("/copywritings", copywritingRoutes);
apiRoutes.use("/content-ideas", contentIdeaRoutes);
apiRoutes.use("/content-statuses", contentStatusRoutes);
apiRoutes.use("/dashboards", dashboardRoutes);
apiRoutes.use("/discord-operations", discordOperationRoutes);
apiRoutes.use("/editorial-calendar", editorialCalendarRoutes);
apiRoutes.use("/emails", emailCampaignRoutes);
apiRoutes.use("/external-publication", externalIntegrationRoutes);
apiRoutes.use("/launches", launchRoutes);
apiRoutes.use("/live-events", liveEventRoutes);
apiRoutes.use("/operational-emails", operationalEmailRoutes);
apiRoutes.use("/profiles", profileRoutes);
apiRoutes.use("/publications", publicationRoutes);
apiRoutes.use("/production-checklists", productionChecklistRoutes);
apiRoutes.use("/reels", reelRoutes);
apiRoutes.use("/roles", roleRoutes);
apiRoutes.use("/stories", storySequenceRoutes);
apiRoutes.use("/students", studentRoutes);
apiRoutes.use("/traffic-audiences", trafficAudienceRoutes);
apiRoutes.use("/traffic-campaigns", trafficCampaignRoutes);
apiRoutes.use("/traffic-conversion-events", trafficConversionEventRoutes);
apiRoutes.use("/traffic-creatives", trafficCreativeRoutes);
apiRoutes.use("/traffic-pixels", trafficPixelRoutes);
apiRoutes.use("/traffic-reports", trafficReportRoutes);
apiRoutes.use("/traffic-roi", trafficRoiRoutes);
apiRoutes.use("/youtube-contents", youtubeContentRoutes);
apiRoutes.use("/users", userRoutes);

import { beforeEach, describe, expect, it, vi } from "vitest";

const permissionModel = {
  updateOne: vi.fn(),
  find: vi.fn()
};

const roleModel = {
  updateOne: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/models/permission.model.js", () => ({
  Permission: permissionModel
}));

vi.mock("../src/models/role.model.js", () => ({
  Role: roleModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService
}));

const { accessSeedService } = await import("../src/services/access-seed.service.js");

describe("accessSeedService.ensureCoreAccessSeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionModel.updateOne.mockResolvedValue({ modifiedCount: 0, upsertedCount: 0 });
    roleModel.updateOne.mockResolvedValue({ modifiedCount: 0, upsertedCount: 0 });
  });

  it("upserts permissions and the admin role with the initial matrix", async () => {
    const permissionCodes = [
      "AUDIT_READ",
      "AUTH_LOGIN",
      "PERMISSION_READ",
      "ROLE_READ",
      "USER_BOOTSTRAP_ADMIN",
      "USER_CREATE",
      "USER_LIST",
      "USER_MANAGE",
      "USER_READ",
      "USER_UPDATE",
      "USER_ACTIVATE",
      "USER_DEACTIVATE",
      "USER_CHANGE_ROLE",
      "PLATFORM_SETTING_READ",
      "PLATFORM_SETTING_UPDATE",
      "LAUNCH_CREATE",
      "LAUNCH_READ",
      "MARKET_RESEARCH_CREATE",
      "COMPETITOR_RESEARCH_CREATE",
      "AVATAR_CREATE",
      "AVATAR_SUGGEST",
      "AVATAR_UPDATE",
      "OFFER_CREATE",
      "OFFER_UPDATE",
      "POSITIONING_CREATE",
      "POSITIONING_UPDATE",
      "EDITORIAL_LINE_CREATE",
      "EDITORIAL_LINE_UPDATE",
      "CONTENT_PLAN_CREATE",
      "CONTENT_PLAN_UPDATE",
      "SMART_SCHEDULE_CREATE",
      "SMART_SCHEDULE_UPDATE",
      "EXPERT_APPROVAL_DECIDE",
      "EXPERT_APPROVAL_SUBMIT",
      "STRATEGY_ARCHIVE",
      "STRATEGY_CREATE",
      "STRATEGY_DUPLICATE",
      "STRATEGY_GENERATE_AI",
      "STRATEGY_READ",
      "STRATEGY_SUBMIT_APPROVAL",
      "STRATEGY_UPDATE",
      "DASHBOARD_OVERVIEW_READ",
      "STRATEGIST_DASHBOARD_READ",
      "ASSET_LIBRARY_CREATE",
      "ASSET_LIBRARY_DEACTIVATE",
      "ASSET_LIBRARY_READ",
      "CONTENT_IDEA_CREATE",
      "CONTENT_IDEA_DEACTIVATE",
      "CONTENT_IDEA_READ",
      "REEL_CREATE",
      "REEL_UPDATE",
      "CAROUSEL_CREATE",
      "CAROUSEL_UPDATE",
      "STORY_SEQUENCE_CREATE",
      "STORY_SEQUENCE_UPDATE",
      "EMAIL_CAMPAIGN_CREATE",
      "EMAIL_CAMPAIGN_DEACTIVATE",
      "EMAIL_CAMPAIGN_READ",
      "YOUTUBE_CONTENT_CREATE",
      "YOUTUBE_CONTENT_DEACTIVATE",
      "YOUTUBE_CONTENT_UPDATE",
      "COPYWRITING_CREATE",
      "COPYWRITING_GENERATE",
      "CONTENT_APPROVAL_APPROVE",
      "CONTENT_APPROVAL_EXPERT",
      "CONTENT_APPROVAL_PUBLISH",
      "CONTENT_APPROVAL_REVIEW",
      "PUBLICATION_CREATE",
      "PUBLICATION_READ",
      "PUBLICATION_UPDATE",
      "EDITORIAL_CALENDAR_CREATE",
      "EDITORIAL_CALENDAR_READ",
      "EDITORIAL_CALENDAR_UPDATE",
      "PRODUCTION_CHECKLIST_CREATE",
      "PRODUCTION_CHECKLIST_READ",
      "PRODUCTION_CHECKLIST_UPDATE",
      "PRODUCTION_CHECKLIST_REOPEN",
      "CONTENT_STATUS_UPDATE",
      "CONTENT_STATUS_READ",
      "EXTERNAL_INTEGRATION_CREATE",
      "EXTERNAL_INTEGRATION_READ",
      "EXTERNAL_INTEGRATION_UPDATE",
      "EXTERNAL_PUBLICATION_LINK_CREATE",
      "EXTERNAL_PUBLICATION_LINK_READ",
      "TRAFFIC_CAMPAIGN_CREATE",
      "TRAFFIC_CAMPAIGN_READ",
      "TRAFFIC_CAMPAIGN_UPDATE",
      "TRAFFIC_CAMPAIGN_DEACTIVATE",
      "TRAFFIC_CREATIVE_CREATE",
      "TRAFFIC_CREATIVE_READ",
      "TRAFFIC_CREATIVE_UPDATE",
      "TRAFFIC_CREATIVE_DEACTIVATE",
      "TRAFFIC_PIXEL_CREATE",
      "TRAFFIC_PIXEL_READ",
      "TRAFFIC_PIXEL_UPDATE",
      "TRAFFIC_PIXEL_LINK",
      "TRAFFIC_PIXEL_DEACTIVATE",
      "TRAFFIC_AUDIENCE_CREATE",
      "TRAFFIC_AUDIENCE_READ",
      "TRAFFIC_AUDIENCE_UPDATE",
      "TRAFFIC_AUDIENCE_DEACTIVATE",
      "TRAFFIC_CONVERSION_EVENT_CREATE",
      "TRAFFIC_CONVERSION_EVENT_READ",
      "TRAFFIC_CONVERSION_EVENT_UPDATE",
      "TRAFFIC_CONVERSION_EVENT_LINK",
      "TRAFFIC_CONVERSION_EVENT_DEACTIVATE",
      "TRAFFIC_REPORT_READ",
      "TRAFFIC_ROI_READ",
      "CLASS_SCHEDULE_CREATE",
      "CLASS_SCHEDULE_READ",
      "CLASS_SCHEDULE_UPDATE",
      "CLASS_SCHEDULE_DEACTIVATE",
      "LIVE_EVENT_CREATE",
      "LIVE_EVENT_READ",
      "LIVE_EVENT_UPDATE",
      "LIVE_EVENT_DEACTIVATE",
      "DISCORD_OPERATION_CREATE",
      "DISCORD_OPERATION_READ",
      "DISCORD_OPERATION_UPDATE",
      "DISCORD_OPERATION_DEACTIVATE",
      "OPERATIONAL_EMAIL_CREATE",
      "OPERATIONAL_EMAIL_READ",
      "OPERATIONAL_EMAIL_UPDATE",
      "OPERATIONAL_EMAIL_DEACTIVATE",
      "STUDENT_CREATE",
      "STUDENT_READ",
      "STUDENT_UPDATE",
      "STUDENT_DEACTIVATE",
      "SUPPORT_TICKET_CREATE",
      "SUPPORT_TICKET_READ",
      "SUPPORT_TICKET_UPDATE",
      "SUPPORT_TICKET_DEACTIVATE",
      "OPERATIONAL_CHECKLIST_CREATE",
      "OPERATIONAL_CHECKLIST_READ",
      "OPERATIONAL_CHECKLIST_UPDATE",
      "OPERATIONAL_CHECKLIST_DEACTIVATE",
      "AI_SCHEDULE_GENERATE",
      "AI_SCHEDULE_CREATE",
      "AI_SCHEDULE_READ",
      "AI_BRAND_MATERIAL_GENERATE",
      "AI_BRAND_MATERIAL_CREATE",
      "AI_BRAND_MATERIAL_READ",
      "AI_HISTORICAL_CONTENT_CREATE",
      "AI_HISTORICAL_CONTENT_READ",
      "AI_HISTORICAL_CONTENT_RECOMMEND",
      "AI_HISTORICAL_CONTENT_DEACTIVATE",
      "AI_METRIC_INSIGHT_GENERATE",
      "AI_METRIC_INSIGHT_READ",
      "AI_TEAM_AUTOMATION_CREATE",
      "AI_TEAM_AUTOMATION_READ",
      "AI_TEAM_AUTOMATION_UPDATE",
      "AI_TEAM_AUTOMATION_EXECUTE"
    ];

    permissionModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue(permissionCodes.map((code, index) => ({
        _id: `perm-${index}`,
        code
      })))
    });

    await accessSeedService.ensureCoreAccessSeed();

    expect(permissionModel.updateOne).toHaveBeenCalledTimes(permissionCodes.length);
    expect(permissionModel.find).toHaveBeenCalledWith(
      {
        code: {
          $in: expect.arrayContaining(["AUTH_LOGIN", "STRATEGY_CREATE", "DASHBOARD_OVERVIEW_READ", "PLATFORM_SETTING_UPDATE"])
        }
      },
      { _id: 1, code: 1 }
    );
    expect(roleModel.updateOne).toHaveBeenCalledWith(
      { code: "ADMIN" },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          code: "ADMIN",
          permissionIds: permissionCodes.map((_code, index) => `perm-${index}`)
        }),
        $set: expect.objectContaining({
          name: "Administrador",
          active: true
        })
      }),
      { upsert: true }
    );
    expect(roleModel.updateOne).toHaveBeenCalledWith(
      { code: "ADMIN" },
      {
        $addToSet: {
          permissionIds: {
            $each: permissionCodes.map((_code, index) => `perm-${index}`)
          }
        }
      }
    );
    expect(roleModel.updateOne).toHaveBeenCalledTimes(12);
  });
});

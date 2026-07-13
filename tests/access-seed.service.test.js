import { beforeEach, describe, expect, it, vi } from "vitest";

const permissionModel = {
  updateOne: vi.fn(),
  find: vi.fn()
};

const roleModel = {
  updateOne: vi.fn()
};

vi.mock("../src/models/permission.model.js", () => ({
  Permission: permissionModel
}));

vi.mock("../src/models/role.model.js", () => ({
  Role: roleModel
}));

const { accessSeedService } = await import("../src/services/access-seed.service.js");

describe("accessSeedService.ensureCoreAccessSeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      "STRATEGIST_DASHBOARD_READ",
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
      "TRAFFIC_PIXEL_DEACTIVATE"
    ];

    permissionModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue(permissionCodes.map((code, index) => ({
        _id: `perm-${index}`,
        code
      })))
    });

    await accessSeedService.ensureCoreAccessSeed();

    expect(permissionModel.updateOne).toHaveBeenCalledTimes(permissionCodes.length);
    expect(permissionModel.updateOne).toHaveBeenCalledWith(
      { code: "AUTH_LOGIN" },
      expect.objectContaining({
        $setOnInsert: {
          code: "AUTH_LOGIN"
        },
        $set: expect.objectContaining({
          name: "Autenticar usuario",
          module: "auth",
          active: true
        })
      }),
      { upsert: true }
    );
    expect(roleModel.updateOne).toHaveBeenCalledWith(
      { code: "ADMIN" },
      expect.objectContaining({
        $set: expect.objectContaining({
          permissionIds: permissionCodes.map((_code, index) => `perm-${index}`),
          active: true
        })
      }),
      { upsert: true }
    );
    expect(roleModel.updateOne).toHaveBeenCalledTimes(6);
  });
});

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
    permissionModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        { _id: "perm-0", code: "AUDIT_READ" },
        { _id: "perm-1", code: "AUTH_LOGIN" },
        { _id: "perm-2", code: "PERMISSION_READ" },
        { _id: "perm-3", code: "ROLE_READ" },
        { _id: "perm-4", code: "USER_BOOTSTRAP_ADMIN" },
        { _id: "perm-5", code: "USER_CREATE" },
        { _id: "perm-6", code: "USER_LIST" },
        { _id: "perm-7", code: "USER_MANAGE" },
        { _id: "perm-8", code: "USER_READ" },
        { _id: "perm-9", code: "USER_UPDATE" },
        { _id: "perm-10", code: "USER_ACTIVATE" },
        { _id: "perm-11", code: "USER_DEACTIVATE" },
        { _id: "perm-12", code: "USER_CHANGE_ROLE" },
        { _id: "perm-13", code: "LAUNCH_CREATE" },
        { _id: "perm-14", code: "LAUNCH_READ" },
        { _id: "perm-15", code: "MARKET_RESEARCH_CREATE" },
        { _id: "perm-16", code: "COMPETITOR_RESEARCH_CREATE" },
        { _id: "perm-17", code: "AVATAR_CREATE" },
        { _id: "perm-18", code: "AVATAR_SUGGEST" },
        { _id: "perm-19", code: "AVATAR_UPDATE" },
        { _id: "perm-20", code: "OFFER_CREATE" },
        { _id: "perm-21", code: "OFFER_UPDATE" },
        { _id: "perm-22", code: "POSITIONING_CREATE" },
        { _id: "perm-23", code: "POSITIONING_UPDATE" },
        { _id: "perm-24", code: "EDITORIAL_LINE_CREATE" },
        { _id: "perm-25", code: "EDITORIAL_LINE_UPDATE" },
        { _id: "perm-26", code: "CONTENT_PLAN_CREATE" },
        { _id: "perm-27", code: "CONTENT_PLAN_UPDATE" },
        { _id: "perm-28", code: "SMART_SCHEDULE_CREATE" },
        { _id: "perm-29", code: "SMART_SCHEDULE_UPDATE" },
        { _id: "perm-30", code: "EXPERT_APPROVAL_DECIDE" },
        { _id: "perm-31", code: "EXPERT_APPROVAL_SUBMIT" },
        { _id: "perm-32", code: "ASSET_LIBRARY_CREATE" },
        { _id: "perm-33", code: "ASSET_LIBRARY_DEACTIVATE" },
        { _id: "perm-34", code: "ASSET_LIBRARY_READ" },
        { _id: "perm-35", code: "CONTENT_IDEA_CREATE" },
        { _id: "perm-36", code: "CONTENT_IDEA_DEACTIVATE" },
        { _id: "perm-37", code: "CONTENT_IDEA_READ" },
        { _id: "perm-38", code: "REEL_CREATE" },
        { _id: "perm-39", code: "REEL_UPDATE" },
        { _id: "perm-40", code: "CAROUSEL_CREATE" },
        { _id: "perm-41", code: "CAROUSEL_UPDATE" },
        { _id: "perm-42", code: "STORY_SEQUENCE_CREATE" },
        { _id: "perm-43", code: "STORY_SEQUENCE_UPDATE" },
        { _id: "perm-44", code: "EMAIL_CAMPAIGN_CREATE" },
        { _id: "perm-45", code: "EMAIL_CAMPAIGN_DEACTIVATE" },
        { _id: "perm-46", code: "EMAIL_CAMPAIGN_READ" },
        { _id: "perm-47", code: "YOUTUBE_CONTENT_CREATE" },
        { _id: "perm-48", code: "YOUTUBE_CONTENT_DEACTIVATE" },
        { _id: "perm-49", code: "YOUTUBE_CONTENT_UPDATE" },
        { _id: "perm-50", code: "COPYWRITING_CREATE" },
        { _id: "perm-51", code: "COPYWRITING_GENERATE" },
        { _id: "perm-52", code: "CONTENT_APPROVAL_APPROVE" },
        { _id: "perm-53", code: "CONTENT_APPROVAL_EXPERT" },
        { _id: "perm-54", code: "CONTENT_APPROVAL_PUBLISH" },
        { _id: "perm-55", code: "CONTENT_APPROVAL_REVIEW" },
        { _id: "perm-56", code: "STRATEGIST_DASHBOARD_READ" },
        { _id: "perm-57", code: "PUBLICATION_CREATE" },
        { _id: "perm-58", code: "PUBLICATION_READ" },
        { _id: "perm-59", code: "PUBLICATION_UPDATE" },
        { _id: "perm-60", code: "EDITORIAL_CALENDAR_CREATE" },
        { _id: "perm-61", code: "EDITORIAL_CALENDAR_READ" },
        { _id: "perm-62", code: "EDITORIAL_CALENDAR_UPDATE" },
        { _id: "perm-63", code: "PRODUCTION_CHECKLIST_CREATE" },
        { _id: "perm-64", code: "PRODUCTION_CHECKLIST_READ" },
        { _id: "perm-65", code: "PRODUCTION_CHECKLIST_UPDATE" },
        { _id: "perm-66", code: "PRODUCTION_CHECKLIST_REOPEN" },
        { _id: "perm-67", code: "CONTENT_STATUS_UPDATE" },
        { _id: "perm-68", code: "CONTENT_STATUS_READ" },
        { _id: "perm-69", code: "EXTERNAL_INTEGRATION_CREATE" },
        { _id: "perm-70", code: "EXTERNAL_INTEGRATION_READ" },
        { _id: "perm-71", code: "EXTERNAL_INTEGRATION_UPDATE" },
        { _id: "perm-72", code: "EXTERNAL_PUBLICATION_LINK_CREATE" },
        { _id: "perm-73", code: "EXTERNAL_PUBLICATION_LINK_READ" },
        { _id: "perm-74", code: "TRAFFIC_CAMPAIGN_CREATE" },
        { _id: "perm-75", code: "TRAFFIC_CAMPAIGN_READ" },
        { _id: "perm-76", code: "TRAFFIC_CAMPAIGN_UPDATE" },
        { _id: "perm-77", code: "TRAFFIC_CAMPAIGN_DEACTIVATE" },
        { _id: "perm-78", code: "TRAFFIC_CREATIVE_CREATE" },
        { _id: "perm-79", code: "TRAFFIC_CREATIVE_READ" },
        { _id: "perm-80", code: "TRAFFIC_CREATIVE_UPDATE" },
        { _id: "perm-81", code: "TRAFFIC_CREATIVE_DEACTIVATE" },
        { _id: "perm-82", code: "TRAFFIC_PIXEL_CREATE" },
        { _id: "perm-83", code: "TRAFFIC_PIXEL_READ" },
        { _id: "perm-84", code: "TRAFFIC_PIXEL_UPDATE" },
        { _id: "perm-85", code: "TRAFFIC_PIXEL_LINK" },
        { _id: "perm-86", code: "TRAFFIC_PIXEL_DEACTIVATE" },
        { _id: "perm-87", code: "TRAFFIC_AUDIENCE_CREATE" },
        { _id: "perm-88", code: "TRAFFIC_AUDIENCE_READ" },
        { _id: "perm-89", code: "TRAFFIC_AUDIENCE_UPDATE" },
        { _id: "perm-90", code: "TRAFFIC_AUDIENCE_DEACTIVATE" },
        { _id: "perm-91", code: "TRAFFIC_CONVERSION_EVENT_CREATE" },
        { _id: "perm-92", code: "TRAFFIC_CONVERSION_EVENT_READ" },
        { _id: "perm-93", code: "TRAFFIC_CONVERSION_EVENT_UPDATE" },
        { _id: "perm-94", code: "TRAFFIC_CONVERSION_EVENT_LINK" },
        { _id: "perm-95", code: "TRAFFIC_CONVERSION_EVENT_DEACTIVATE" },
        { _id: "perm-96", code: "TRAFFIC_REPORT_READ" },
        { _id: "perm-97", code: "TRAFFIC_ROI_READ" },
        { _id: "perm-98", code: "CLASS_SCHEDULE_CREATE" },
        { _id: "perm-99", code: "CLASS_SCHEDULE_READ" },
        { _id: "perm-100", code: "CLASS_SCHEDULE_UPDATE" },
        { _id: "perm-101", code: "CLASS_SCHEDULE_DEACTIVATE" },
        { _id: "perm-102", code: "LIVE_EVENT_CREATE" },
        { _id: "perm-103", code: "LIVE_EVENT_READ" },
        { _id: "perm-104", code: "LIVE_EVENT_UPDATE" },
        { _id: "perm-105", code: "LIVE_EVENT_DEACTIVATE" },
        { _id: "perm-106", code: "DISCORD_OPERATION_CREATE" },
        { _id: "perm-107", code: "DISCORD_OPERATION_READ" },
        { _id: "perm-108", code: "DISCORD_OPERATION_UPDATE" },
        { _id: "perm-109", code: "DISCORD_OPERATION_DEACTIVATE" },
        { _id: "perm-110", code: "OPERATIONAL_EMAIL_CREATE" },
        { _id: "perm-111", code: "OPERATIONAL_EMAIL_READ" },
        { _id: "perm-112", code: "OPERATIONAL_EMAIL_UPDATE" },
        { _id: "perm-113", code: "OPERATIONAL_EMAIL_DEACTIVATE" },
        { _id: "perm-114", code: "STUDENT_CREATE" },
        { _id: "perm-115", code: "STUDENT_READ" },
        { _id: "perm-116", code: "STUDENT_UPDATE" },
        { _id: "perm-117", code: "STUDENT_DEACTIVATE" },
        { _id: "perm-118", code: "SUPPORT_TICKET_CREATE" },
        { _id: "perm-119", code: "SUPPORT_TICKET_READ" },
        { _id: "perm-120", code: "SUPPORT_TICKET_UPDATE" },
        { _id: "perm-121", code: "SUPPORT_TICKET_DEACTIVATE" },
        { _id: "perm-122", code: "OPERATIONAL_CHECKLIST_CREATE" },
        { _id: "perm-123", code: "OPERATIONAL_CHECKLIST_READ" },
        { _id: "perm-124", code: "OPERATIONAL_CHECKLIST_UPDATE" },
        { _id: "perm-125", code: "OPERATIONAL_CHECKLIST_DEACTIVATE" },
        { _id: "perm-126", code: "AI_SCHEDULE_GENERATE" },
        { _id: "perm-127", code: "AI_SCHEDULE_CREATE" },
        { _id: "perm-128", code: "AI_SCHEDULE_READ" },
        { _id: "perm-129", code: "AI_BRAND_MATERIAL_GENERATE" },
        { _id: "perm-130", code: "AI_BRAND_MATERIAL_CREATE" },
        { _id: "perm-131", code: "AI_BRAND_MATERIAL_READ" }
      ])
    });

    await accessSeedService.ensureCoreAccessSeed();

    expect(permissionModel.updateOne).toHaveBeenCalledTimes(132);
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
          permissionIds: ["perm-0", "perm-1", "perm-2", "perm-3", "perm-4", "perm-5", "perm-6", "perm-7", "perm-8", "perm-9", "perm-10", "perm-11", "perm-12", "perm-13", "perm-14", "perm-15", "perm-16", "perm-17", "perm-18", "perm-19", "perm-20", "perm-21", "perm-22", "perm-23", "perm-24", "perm-25", "perm-26", "perm-27", "perm-28", "perm-29", "perm-30", "perm-31", "perm-32", "perm-33", "perm-34", "perm-35", "perm-36", "perm-37", "perm-38", "perm-39", "perm-40", "perm-41", "perm-42", "perm-43", "perm-44", "perm-45", "perm-46", "perm-47", "perm-48", "perm-49", "perm-50", "perm-51", "perm-52", "perm-53", "perm-54", "perm-55", "perm-56", "perm-57", "perm-58", "perm-59", "perm-60", "perm-61", "perm-62", "perm-63", "perm-64", "perm-65", "perm-66", "perm-67", "perm-68", "perm-69", "perm-70", "perm-71", "perm-72", "perm-73", "perm-74", "perm-75", "perm-76", "perm-77", "perm-78", "perm-79", "perm-80", "perm-81", "perm-82", "perm-83", "perm-84", "perm-85", "perm-86", "perm-87", "perm-88", "perm-89", "perm-90", "perm-91", "perm-92", "perm-93", "perm-94", "perm-95", "perm-96", "perm-97", "perm-98", "perm-99", "perm-100", "perm-101", "perm-102", "perm-103", "perm-104", "perm-105", "perm-106", "perm-107", "perm-108", "perm-109", "perm-110", "perm-111", "perm-112", "perm-113", "perm-114", "perm-115", "perm-116", "perm-117", "perm-118", "perm-119", "perm-120", "perm-121", "perm-122", "perm-123", "perm-124", "perm-125", "perm-126", "perm-127", "perm-128", "perm-129", "perm-130", "perm-131"],
          active: true
        })
      }),
      { upsert: true }
    );
    expect(roleModel.updateOne).toHaveBeenCalledTimes(6);
  });
});

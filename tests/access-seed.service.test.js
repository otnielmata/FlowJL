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
        { _id: "perm-32", code: "CONTENT_IDEA_CREATE" },
        { _id: "perm-33", code: "CONTENT_IDEA_DEACTIVATE" },
        { _id: "perm-34", code: "CONTENT_IDEA_READ" },
        { _id: "perm-35", code: "REEL_CREATE" },
        { _id: "perm-36", code: "REEL_UPDATE" },
        { _id: "perm-37", code: "CAROUSEL_CREATE" },
        { _id: "perm-38", code: "CAROUSEL_UPDATE" },
        { _id: "perm-39", code: "STORY_SEQUENCE_CREATE" },
        { _id: "perm-40", code: "STORY_SEQUENCE_UPDATE" },
        { _id: "perm-41", code: "EMAIL_CAMPAIGN_CREATE" },
        { _id: "perm-42", code: "EMAIL_CAMPAIGN_DEACTIVATE" },
        { _id: "perm-43", code: "EMAIL_CAMPAIGN_READ" },
        { _id: "perm-44", code: "YOUTUBE_CONTENT_CREATE" },
        { _id: "perm-45", code: "YOUTUBE_CONTENT_DEACTIVATE" },
        { _id: "perm-46", code: "YOUTUBE_CONTENT_UPDATE" }
      ])
    });

    await accessSeedService.ensureCoreAccessSeed();

    expect(permissionModel.updateOne).toHaveBeenCalledTimes(47);
    expect(roleModel.updateOne).toHaveBeenCalledWith(
      { code: "ADMIN" },
      expect.objectContaining({
        $set: expect.objectContaining({
          permissionIds: ["perm-0", "perm-1", "perm-2", "perm-3", "perm-4", "perm-5", "perm-6", "perm-7", "perm-8", "perm-9", "perm-10", "perm-11", "perm-12", "perm-13", "perm-14", "perm-15", "perm-16", "perm-17", "perm-18", "perm-19", "perm-20", "perm-21", "perm-22", "perm-23", "perm-24", "perm-25", "perm-26", "perm-27", "perm-28", "perm-29", "perm-30", "perm-31", "perm-32", "perm-33", "perm-34", "perm-35", "perm-36", "perm-37", "perm-38", "perm-39", "perm-40", "perm-41", "perm-42", "perm-43", "perm-44", "perm-45", "perm-46"],
          active: true
        })
      }),
      { upsert: true }
    );
    expect(roleModel.updateOne).toHaveBeenCalledTimes(6);
  });
});

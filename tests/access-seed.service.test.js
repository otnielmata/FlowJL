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
        { _id: "perm-1", code: "AUTH_LOGIN" },
        { _id: "perm-2", code: "PERMISSION_READ" },
        { _id: "perm-3", code: "ROLE_READ" },
        { _id: "perm-4", code: "USER_BOOTSTRAP_ADMIN" },
        { _id: "perm-5", code: "USER_CREATE" },
        { _id: "perm-6", code: "USER_LIST" },
        { _id: "perm-7", code: "USER_MANAGE" },
        { _id: "perm-8", code: "USER_READ" }
      ])
    });

    await accessSeedService.ensureCoreAccessSeed();

    expect(permissionModel.updateOne).toHaveBeenCalledTimes(8);
    expect(roleModel.updateOne).toHaveBeenCalledWith(
      { code: "ADMIN" },
      expect.objectContaining({
        $set: expect.objectContaining({
          permissionIds: ["perm-1", "perm-2", "perm-3", "perm-4", "perm-5", "perm-6", "perm-7", "perm-8"],
          active: true
        })
      }),
      { upsert: true }
    );
    expect(roleModel.updateOne).toHaveBeenCalledTimes(6);
  });
});

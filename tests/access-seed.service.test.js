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
      sort: vi.fn().mockResolvedValue([{ _id: "perm-1" }, { _id: "perm-2" }])
    });

    await accessSeedService.ensureCoreAccessSeed();

    expect(permissionModel.updateOne).toHaveBeenCalledTimes(5);
    expect(roleModel.updateOne).toHaveBeenCalledWith(
      { code: "ADMIN" },
      expect.objectContaining({
        $set: expect.objectContaining({
          permissionIds: ["perm-1", "perm-2"],
          active: true
        })
      }),
      { upsert: true }
    );
  });
});

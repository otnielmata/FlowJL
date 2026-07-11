import { beforeEach, describe, expect, it, vi } from "vitest";

const userModel = {
  findById: vi.fn()
};

const roleModel = {
  findOne: vi.fn()
};

const permissionModel = {
  findOne: vi.fn()
};

vi.mock("../src/models/user.model.js", () => ({
  User: userModel
}));

vi.mock("../src/models/role.model.js", () => ({
  Role: roleModel
}));

vi.mock("../src/models/permission.model.js", () => ({
  Permission: permissionModel
}));

const { requirePermission } = await import("../src/middleware/permission.middleware.js");

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows authenticated users with the required permission", async () => {
    const middleware = requirePermission("USER_READ");
    const request = {
      auth: {
        sub: "user-id"
      }
    };
    const next = vi.fn();

    userModel.findById.mockResolvedValue({
      id: "user-id",
      roleId: "role-id",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue({
      _id: "role-id",
      permissionIds: ["perm-id"],
      active: true
    });
    permissionModel.findOne.mockResolvedValue({
      _id: "perm-id",
      code: "USER_READ",
      active: true
    });

    await middleware(request, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects users without the required permission", async () => {
    const middleware = requirePermission("USER_LIST");
    const next = vi.fn();

    userModel.findById.mockResolvedValue({
      id: "user-id",
      roleId: "role-id",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue({
      _id: "role-id",
      permissionIds: [],
      active: true
    });
    permissionModel.findOne.mockResolvedValue(null);

    await middleware({ auth: { sub: "user-id" } }, {}, next);

    expect(next).toHaveBeenCalledWith({
      statusCode: 403,
      message: "Access denied"
    });
  });

  it("evaluates authorization from the authenticated user role permissions", async () => {
    const middleware = requirePermission("ROLE_READ");
    const request = {
      auth: {
        sub: "user-id"
      }
    };
    const next = vi.fn();

    userModel.findById.mockResolvedValue({
      id: "user-id",
      roleId: "role-id",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue({
      _id: "role-id",
      permissionIds: ["perm-role-read"],
      active: true
    });
    permissionModel.findOne.mockResolvedValue({
      _id: "perm-role-read",
      code: "ROLE_READ",
      active: true
    });

    await middleware(request, {}, next);

    expect(roleModel.findOne).toHaveBeenCalledWith({
      _id: "role-id",
      active: true
    });
    expect(permissionModel.findOne).toHaveBeenCalledWith({
      _id: {
        $in: ["perm-role-read"]
      },
      code: "ROLE_READ",
      active: true
    });
    expect(next).toHaveBeenCalledWith();
  });
});

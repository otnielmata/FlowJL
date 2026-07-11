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

const { requireUserUpdatePermission } = await import("../src/middleware/user-update-permission.middleware.js");

describe("requireUserUpdatePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows update when the authenticated user has the required permission", async () => {
    const next = vi.fn();
    userModel.findById.mockResolvedValue({
      id: "admin-id",
      roleId: "role-id",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue({
      _id: "role-id",
      permissionIds: ["perm-1"],
      active: true
    });
    permissionModel.findOne.mockResolvedValue({
      _id: "perm-1",
      code: "USER_UPDATE",
      active: true
    });

    await requireUserUpdatePermission(
      {
        auth: { sub: "admin-id" },
        body: { name: "Novo Nome" }
      },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  it("blocks update when the authenticated user lacks the required permission", async () => {
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

    await requireUserUpdatePermission(
      {
        auth: { sub: "user-id" },
        body: { status: "INACTIVE" }
      },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith({
      statusCode: 403,
      message: "Access denied"
    });
  });
});

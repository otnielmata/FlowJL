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

  it("requires USER_ACTIVATE permission to reactivate an inactive collaborator", async () => {
    const next = vi.fn();
    userModel.findById.mockResolvedValue({
      id: "manager-id",
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
      code: "USER_ACTIVATE",
      active: true
    });

    await requireUserUpdatePermission(
      {
        auth: { sub: "manager-id" },
        body: { status: "ACTIVE" }
      },
      {},
      next
    );

    expect(permissionModel.findOne).toHaveBeenCalledWith({
      _id: {
        $in: ["perm-1"]
      },
      code: "USER_ACTIVATE",
      active: true
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("requires USER_DEACTIVATE permission to deactivate an active collaborator", async () => {
    const next = vi.fn();
    userModel.findById.mockResolvedValue({
      id: "manager-id",
      roleId: "role-id",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue({
      _id: "role-id",
      permissionIds: ["perm-2"],
      active: true
    });
    permissionModel.findOne.mockResolvedValue({
      _id: "perm-2",
      code: "USER_DEACTIVATE",
      active: true
    });

    await requireUserUpdatePermission(
      {
        auth: { sub: "manager-id" },
        body: { status: "INACTIVE" }
      },
      {},
      next
    );

    expect(permissionModel.findOne).toHaveBeenCalledWith({
      _id: {
        $in: ["perm-2"]
      },
      code: "USER_DEACTIVATE",
      active: true
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("requires USER_CHANGE_ROLE permission to change a collaborator role", async () => {
    const next = vi.fn();
    userModel.findById.mockResolvedValue({
      id: "manager-id",
      roleId: "role-id",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue({
      _id: "role-id",
      permissionIds: ["perm-3"],
      active: true
    });
    permissionModel.findOne.mockResolvedValue({
      _id: "perm-3",
      code: "USER_CHANGE_ROLE",
      active: true
    });

    await requireUserUpdatePermission(
      {
        auth: { sub: "manager-id" },
        body: { roleId: "new-role-id" }
      },
      {},
      next
    );

    expect(permissionModel.findOne).toHaveBeenCalledWith({
      _id: {
        $in: ["perm-3"]
      },
      code: "USER_CHANGE_ROLE",
      active: true
    });
    expect(next).toHaveBeenCalledWith();
  });
});

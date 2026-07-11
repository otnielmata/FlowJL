import { beforeEach, describe, expect, it, vi } from "vitest";

const userModel = {
  findById: vi.fn()
};

const roleModel = {
  findOne: vi.fn()
};

vi.mock("../src/models/user.model.js", () => ({
  User: userModel
}));

vi.mock("../src/models/role.model.js", () => ({
  Role: roleModel
}));

const { adminMiddleware } = await import("../src/middleware/admin.middleware.js");

describe("adminMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows active admins to continue", async () => {
    const request = {
      auth: {
        sub: "admin-user-id"
      }
    };
    const next = vi.fn();

    userModel.findById.mockResolvedValue({
      id: "admin-user-id",
      roleId: "role-admin-id",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue({
      _id: "role-admin-id",
      code: "ADMIN",
      active: true
    });

    await adminMiddleware(request, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(request.currentUser).toMatchObject({
      id: "admin-user-id"
    });
  });

  it("rejects non-admin users", async () => {
    const next = vi.fn();

    userModel.findById.mockResolvedValue({
      id: "user-id",
      roleId: "role-user-id",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue(null);

    await adminMiddleware({ auth: { sub: "user-id" } }, {}, next);

    expect(next).toHaveBeenCalledWith({
      statusCode: 403,
      message: "Access denied"
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const userModel = {
  findOne: vi.fn(),
  exists: vi.fn(),
  create: vi.fn(),
  findByIdAndUpdate: vi.fn()
};

const roleModel = {
  findOne: vi.fn()
};

const profileModel = {
  findById: vi.fn()
};

const bcryptMock = {
  hash: vi.fn()
};

vi.mock("../src/models/user.model.js", () => ({
  User: userModel
}));

vi.mock("../src/models/role.model.js", () => ({
  Role: roleModel
}));

vi.mock("../src/models/profile.model.js", () => ({
  Profile: profileModel
}));

vi.mock("bcryptjs", () => ({
  default: bcryptMock
}));

const { toPublicUser, userService } = await import("../src/services/user.service.js");

describe("userService.createBootstrapAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the first admin with normalized email and admin role", async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.exists.mockResolvedValue(null);
    roleModel.findOne.mockResolvedValue({ _id: "role-admin-id" });
    bcryptMock.hash.mockResolvedValue("hashed-password");
    userModel.create.mockResolvedValue({
      id: "user-id",
      name: "Flow JL Admin",
      email: "admin@flowjl.com",
      status: "ACTIVE",
      roleId: "role-admin-id",
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
      updatedAt: new Date("2026-07-10T00:00:00.000Z"),
      createdBy: null,
      updatedBy: null,
      lastLoginAt: null,
      deactivatedAt: null
    });

    const result = await userService.createBootstrapAdmin({
      name: " Flow JL Admin ",
      email: " Admin@FlowJL.com ",
      password: "Admin@123"
    });

    expect(userModel.findOne).toHaveBeenCalledWith({ email: "admin@flowjl.com" });
    expect(userModel.exists).toHaveBeenCalledWith({});
    expect(roleModel.findOne).toHaveBeenCalledWith({ code: "ADMIN", active: true });
    expect(bcryptMock.hash).toHaveBeenCalledWith("Admin@123", 10);
    expect(userModel.create).toHaveBeenCalledWith({
      name: "Flow JL Admin",
      email: "admin@flowjl.com",
      passwordHash: "hashed-password",
      roleId: "role-admin-id",
      status: "ACTIVE"
    });
    expect(result).toEqual({
      id: "user-id",
      name: "Flow JL Admin",
      email: "admin@flowjl.com",
      status: "ACTIVE",
      roleId: "role-admin-id",
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
      updatedAt: new Date("2026-07-10T00:00:00.000Z"),
      createdBy: null,
      updatedBy: null,
      lastLoginAt: null,
      deactivatedAt: null
    });
  });

  it("rejects duplicate email before creating the bootstrap admin", async () => {
    userModel.findOne.mockResolvedValue({ id: "existing-user" });

    await expect(
      userService.createBootstrapAdmin({
        name: "Flow JL Admin",
        email: "admin@flowjl.com",
        password: "Admin@123"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "A user with this email already exists"
    });
  });

  it("rejects bootstrap when the base already has users", async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.exists.mockResolvedValue({ _id: "another-user" });

    await expect(
      userService.createBootstrapAdmin({
        name: "Flow JL Admin",
        email: "admin@flowjl.com",
        password: "Admin@123"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Initial bootstrap has already been completed"
    });
  });
});

describe("userService.createCollaborator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a collaborator with normalized email, active role and createdBy", async () => {
    userModel.findOne.mockResolvedValue(null);
    roleModel.findOne.mockResolvedValue({ _id: "role-digital-strategist" });
    bcryptMock.hash.mockResolvedValue("hashed-password");
    userModel.create.mockResolvedValue({
      id: "user-id",
      name: "Colaborador Flow JL",
      email: "colaborador@flowjl.com",
      status: "ACTIVE",
      roleId: "role-digital-strategist",
      createdAt: new Date("2026-07-11T00:00:00.000Z"),
      updatedAt: new Date("2026-07-11T00:00:00.000Z"),
      createdBy: "admin-user-id",
      updatedBy: "admin-user-id",
      lastLoginAt: null,
      deactivatedAt: null
    });

    const result = await userService.createCollaborator("admin-user-id", {
      name: " Colaborador Flow JL ",
      email: " Colaborador@FlowJL.com ",
      password: "Colaborador@123",
      roleId: "role-digital-strategist"
    });

    expect(userModel.findOne).toHaveBeenCalledWith({ email: "colaborador@flowjl.com" });
    expect(roleModel.findOne).toHaveBeenCalledWith({
      _id: "role-digital-strategist",
      active: true
    });
    expect(userModel.create).toHaveBeenCalledWith({
      name: "Colaborador Flow JL",
      email: "colaborador@flowjl.com",
      passwordHash: "hashed-password",
      roleId: "role-digital-strategist",
      status: "ACTIVE",
      createdBy: "admin-user-id",
      updatedBy: "admin-user-id"
    });
    expect(result).toEqual({
      id: "user-id",
      name: "Colaborador Flow JL",
      email: "colaborador@flowjl.com",
      status: "ACTIVE",
      roleId: "role-digital-strategist",
      createdAt: new Date("2026-07-11T00:00:00.000Z"),
      updatedAt: new Date("2026-07-11T00:00:00.000Z"),
      createdBy: "admin-user-id",
      updatedBy: "admin-user-id",
      lastLoginAt: null,
      deactivatedAt: null
    });
  });

  it("rejects collaborator creation with duplicate email", async () => {
    userModel.findOne.mockResolvedValue({ id: "existing-user" });

    await expect(
      userService.createCollaborator("admin-user-id", {
        name: "Colaborador Flow JL",
        email: "colaborador@flowjl.com",
        password: "Colaborador@123",
        roleId: "role-digital-strategist"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "A user with this email already exists"
    });
  });

  it("rejects collaborator creation with invalid or inactive role", async () => {
    userModel.findOne.mockResolvedValue(null);
    roleModel.findOne.mockResolvedValue(null);

    await expect(
      userService.createCollaborator("admin-user-id", {
        name: "Colaborador Flow JL",
        email: "colaborador@flowjl.com",
        password: "Colaborador@123",
        roleId: "role-digital-strategist"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Role is invalid or inactive"
    });
  });
});

describe("toPublicUser", () => {
  it("omits passwordHash and returns allowed metadata", () => {
    const result = toPublicUser({
      id: "user-id",
      name: "Flow JL Admin",
      email: "admin@flowjl.com",
      passwordHash: "secret",
      status: "ACTIVE",
      roleId: { _id: "role-admin-id" },
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
      createdBy: null,
      updatedBy: null,
      lastLoginAt: null,
      deactivatedAt: null
    });

    expect(result).toEqual({
      id: "user-id",
      name: "Flow JL Admin",
      email: "admin@flowjl.com",
      status: "ACTIVE",
      roleId: "role-admin-id",
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
      createdBy: null,
      updatedBy: null,
      lastLoginAt: null,
      deactivatedAt: null
    });
    expect(result).not.toHaveProperty("passwordHash");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const userModel = {
  findOne: vi.fn(),
  exists: vi.fn(),
  create: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findById: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn()
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

describe("userService queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a collaborator by id with allowed fields only", async () => {
    userModel.findById.mockResolvedValue({
      id: "user-id",
      name: "Flow JL User",
      email: "user@flowjl.com",
      passwordHash: "secret",
      status: "ACTIVE",
      roleId: "role-id",
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
      createdBy: "admin-id",
      updatedBy: "admin-id",
      lastLoginAt: null,
      deactivatedAt: null
    });

    const result = await userService.getById("user-id");

    expect(result).toEqual({
      id: "user-id",
      name: "Flow JL User",
      email: "user@flowjl.com",
      status: "ACTIVE",
      roleId: "role-id",
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
      createdBy: "admin-id",
      updatedBy: "admin-id",
      lastLoginAt: null,
      deactivatedAt: null
    });
  });

  it("lists collaborators ordered by creation date descending", async () => {
    userModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "user-2",
          name: "User 2",
          email: "user2@flowjl.com",
          status: "ACTIVE",
          roleId: "role-2",
          createdAt: "2026-07-11T00:00:00.000Z",
          updatedAt: "2026-07-11T00:00:00.000Z",
          createdBy: "admin-id",
          updatedBy: "admin-id",
          lastLoginAt: null,
          deactivatedAt: null
        }
      ])
    });

    const result = await userService.list();

    expect(result).toEqual([
      {
        id: "user-2",
        name: "User 2",
        email: "user2@flowjl.com",
        status: "ACTIVE",
        roleId: "role-2",
        createdAt: "2026-07-11T00:00:00.000Z",
        updatedAt: "2026-07-11T00:00:00.000Z",
        createdBy: "admin-id",
        updatedBy: "admin-id",
        lastLoginAt: null,
        deactivatedAt: null
      }
    ]);
  });
});

describe("userService.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates collaborator data, normalizes email and records audit metadata", async () => {
    userModel.findById.mockResolvedValue({
      id: "target-user-id",
      roleId: "role-current-id",
      status: "ACTIVE"
    });
    userModel.findOne.mockResolvedValue(null);
    userModel.findByIdAndUpdate.mockReturnValue({
      populate: vi.fn().mockResolvedValue({
        id: "target-user-id",
        name: "Novo Nome",
        email: "novo@flowjl.com",
        status: "ACTIVE",
        roleId: "role-new-id",
        createdAt: "2026-07-11T00:00:00.000Z",
        updatedAt: "2026-07-11T01:00:00.000Z",
        createdBy: "creator-id",
        updatedBy: "admin-user-id",
        lastLoginAt: null,
        deactivatedAt: null
      })
    });
    roleModel.findOne.mockResolvedValue({ _id: "role-new-id", active: true });

    const result = await userService.update("admin-user-id", "target-user-id", {
      name: "Novo Nome",
      email: " Novo@FlowJL.com ",
      roleId: "role-new-id"
    });

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "target-user-id",
      expect.objectContaining({
        name: "Novo Nome",
        email: "novo@flowjl.com",
        roleId: "role-new-id",
        updatedBy: "admin-user-id",
        lastRoleChangeBy: "admin-user-id"
      }),
      {
        new: true,
        runValidators: true
      }
    );
    expect(result).toEqual({
      id: "target-user-id",
      name: "Novo Nome",
      email: "novo@flowjl.com",
      status: "ACTIVE",
      roleId: "role-new-id",
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T01:00:00.000Z",
      createdBy: "creator-id",
      updatedBy: "admin-user-id",
      lastLoginAt: null,
      deactivatedAt: null
    });
  });

  it("rejects self-deactivation", async () => {
    userModel.findById.mockResolvedValue({
      id: "user-id",
      roleId: "role-user-id",
      status: "ACTIVE"
    });

    await expect(
      userService.update("user-id", "user-id", {
        status: "INACTIVE"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "You cannot deactivate your own account"
    });
  });

  it("rejects deactivation of the last active administrator", async () => {
    userModel.findById.mockResolvedValue({
      id: "admin-id",
      roleId: "role-admin-id",
      status: "ACTIVE"
    });
    roleModel.findOne.mockResolvedValue({ _id: "role-admin-id", code: "ADMIN", active: true });
    userModel.countDocuments.mockResolvedValue(0);

    await expect(
      userService.update("other-admin-id", "admin-id", {
        status: "INACTIVE"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "The last active administrator cannot be deactivated"
    });
  });

  it("clears deactivatedAt when reactivating an inactive collaborator", async () => {
    userModel.findById.mockResolvedValue({
      id: "inactive-user-id",
      roleId: "role-user-id",
      status: "INACTIVE"
    });
    userModel.findByIdAndUpdate.mockReturnValue({
      populate: vi.fn().mockResolvedValue({
        id: "inactive-user-id",
        name: "User",
        email: "user@flowjl.com",
        status: "ACTIVE",
        roleId: "role-user-id",
        createdAt: "2026-07-11T00:00:00.000Z",
        updatedAt: "2026-07-11T01:00:00.000Z",
        createdBy: "creator-id",
        updatedBy: "admin-user-id",
        lastLoginAt: null,
        deactivatedAt: null
      })
    });

    await userService.update("admin-user-id", "inactive-user-id", {
      status: "ACTIVE"
    });

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "inactive-user-id",
      expect.objectContaining({
        status: "ACTIVE",
        deactivatedAt: null,
        updatedBy: "admin-user-id"
      }),
      {
        new: true,
        runValidators: true
      }
    );
  });
});

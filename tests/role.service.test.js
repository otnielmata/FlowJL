import { beforeEach, describe, expect, it, vi } from "vitest";

const roleModel = {
  find: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  findOneAndUpdate: vi.fn()
};

vi.mock("../src/models/role.model.js", () => ({
  Role: roleModel
}));

const { roleService } = await import("../src/services/role.service.js");

describe("roleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists predefined roles with allowed fields", async () => {
    roleModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "role-1",
          code: "ADMIN",
          name: "Administrador",
          description: "Descricao",
          active: true
        }
      ])
    });

    const result = await roleService.list();

    expect(result).toEqual([
      {
        id: "role-1",
        code: "ADMIN",
        name: "Administrador",
        description: "Descricao",
        active: true
      }
    ]);
  });

  it("creates a role only when the code belongs to the initial catalog", async () => {
    roleModel.findOne.mockResolvedValue(null);
    roleModel.create.mockResolvedValue({
      id: "role-2",
      code: "EXPERT",
      name: "Expert",
      description: "Especialista",
      active: true
    });

    const result = await roleService.create({
      code: "expert",
      name: "Expert",
      description: "Especialista",
      active: true
    });

    expect(roleModel.findOne).toHaveBeenCalledWith({ code: "EXPERT" });
    expect(roleModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "EXPERT",
        name: "Expert",
        description: "Especialista",
        active: true
      })
    );
    expect(result).toEqual({
      id: "role-2",
      code: "EXPERT",
      name: "Expert",
      description: "Especialista",
      active: true
    });
  });

  it("rejects creation outside the initial catalog", async () => {
    await expect(
      roleService.create({
        code: "CUSTOM_ROLE",
        name: "Custom",
        description: "Nao permitido",
        active: true
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Role code is outside the initial catalog"
    });
  });

  it("rejects duplicate role code", async () => {
    roleModel.findOne.mockResolvedValue({ id: "role-1" });

    await expect(
      roleService.create({
        code: "ADMIN",
        name: "Administrador",
        description: "Duplicado",
        active: true
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "A role with this code already exists"
    });
  });

  it("updates metadata of an allowed predefined role", async () => {
    roleModel.findOneAndUpdate.mockResolvedValue({
      id: "role-3",
      code: "SOCIAL_MEDIA",
      name: "Social Media",
      description: "Atualizado",
      active: false
    });

    const result = await roleService.update("social_media", {
      name: "Social Media",
      description: "Atualizado",
      active: false
    });

    expect(roleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { code: "SOCIAL_MEDIA" },
      {
        name: "Social Media",
        description: "Atualizado",
        active: false
      },
      {
        new: true,
        runValidators: true
      }
    );
    expect(result).toEqual({
      id: "role-3",
      code: "SOCIAL_MEDIA",
      name: "Social Media",
      description: "Atualizado",
      active: false
    });
  });
});

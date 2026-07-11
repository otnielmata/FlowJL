import { Permission } from "../models/permission.model.js";
import { Role } from "../models/role.model.js";
import { roleCatalog } from "./role-catalog.js";

const corePermissions = [
  {
    code: "AUTH_LOGIN",
    name: "Autenticar usuario",
    description: "Permite autenticar usuarios ativos no fluxo inicial.",
    module: "auth"
  },
  {
    code: "USER_BOOTSTRAP_ADMIN",
    name: "Cadastrar primeiro administrador",
    description: "Permite executar o bootstrap inicial do primeiro administrador.",
    module: "user"
  },
  {
    code: "USER_MANAGE",
    name: "Gerenciar usuarios",
    description: "Permite manter usuarios do modulo core.",
    module: "user"
  },
  {
    code: "USER_CREATE",
    name: "Cadastrar colaboradores",
    description: "Permite cadastrar colaboradores no modulo core.",
    module: "user"
  },
  {
    code: "USER_READ",
    name: "Consultar colaborador",
    description: "Permite consultar um colaborador especifico no modulo core.",
    module: "user"
  },
  {
    code: "USER_LIST",
    name: "Listar colaboradores",
    description: "Permite listar colaboradores do modulo core.",
    module: "user"
  },
  {
    code: "ROLE_READ",
    name: "Consultar cargos",
    description: "Permite consultar cargos disponiveis no core.",
    module: "role"
  },
  {
    code: "PERMISSION_READ",
    name: "Consultar permissoes",
    description: "Permite consultar permissoes disponiveis no core.",
    module: "permission"
  }
];

class AccessSeedService {
  async ensureCoreAccessSeed() {
    for (const permission of corePermissions) {
      await Permission.updateOne(
        { code: permission.code },
        {
          $setOnInsert: permission,
          $set: {
            name: permission.name,
            description: permission.description,
            module: permission.module,
            active: true
          }
        },
        { upsert: true }
      );
    }

    const permissions = await Permission.find(
      {
        code: {
          $in: corePermissions.map((permission) => permission.code)
        }
      },
      { _id: 1 }
    ).sort({ code: 1 });

    for (const role of roleCatalog) {
      const permissionIds = permissions
        .filter((permission) => role.permissionCodes.includes(permission.code))
        .map((permission) => permission._id);

      await Role.updateOne(
        { code: role.code },
        {
          $setOnInsert: {
            code: role.code
          },
          $set: {
            name: role.name,
            description: role.description,
            permissionIds,
            active: true
          }
        },
        { upsert: true }
      );
    }
  }
}

export const accessSeedService = new AccessSeedService();

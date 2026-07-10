import { Permission } from "../models/permission.model.js";
import { Role } from "../models/role.model.js";

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

    await Role.updateOne(
      { code: "ADMIN" },
      {
        $setOnInsert: {
          code: "ADMIN"
        },
        $set: {
          name: "Administrator",
          description: "Cargo inicial com acesso amplo ao core da plataforma.",
          permissionIds: permissions.map((permission) => permission._id),
          active: true
        }
      },
      { upsert: true }
    );
  }
}

export const accessSeedService = new AccessSeedService();

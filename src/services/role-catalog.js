export const roleCatalog = [
  {
    code: "ADMIN",
    name: "Administrador",
    description: "Cargo inicial com acesso amplo ao core da plataforma.",
    permissionCodes: [
      "AUTH_LOGIN",
      "USER_BOOTSTRAP_ADMIN",
      "USER_MANAGE",
      "USER_CREATE",
      "USER_READ",
      "USER_LIST",
      "ROLE_READ",
      "PERMISSION_READ"
    ]
  },
  {
    code: "DIGITAL_STRATEGIST",
    name: "Estrategista Digital",
    description: "Cargo de estrategia digital do Flow JL.",
    permissionCodes: []
  },
  {
    code: "EXPERT",
    name: "Expert",
    description: "Cargo de especialista de conteudo do Flow JL.",
    permissionCodes: []
  },
  {
    code: "TRAFFIC_MANAGER",
    name: "Gestor de Trafego",
    description: "Cargo de gestao de trafego pago do Flow JL.",
    permissionCodes: []
  },
  {
    code: "OPERATIONS",
    name: "Operacoes Administrativas",
    description: "Cargo operacional administrativo do Flow JL.",
    permissionCodes: []
  },
  {
    code: "SOCIAL_MEDIA",
    name: "Social Media",
    description: "Cargo responsavel por redes sociais do Flow JL.",
    permissionCodes: []
  }
];

export const allowedRoleCodes = new Set(roleCatalog.map((role) => role.code));

export function findCatalogRole(code) {
  return roleCatalog.find((role) => role.code === code.toUpperCase()) ?? null;
}

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
      "USER_UPDATE",
      "USER_ACTIVATE",
      "USER_DEACTIVATE",
      "USER_CHANGE_ROLE",
      "ROLE_READ",
      "AUDIT_READ",
      "PERMISSION_READ",
      "LAUNCH_CREATE",
      "LAUNCH_READ",
      "MARKET_RESEARCH_CREATE",
      "COMPETITOR_RESEARCH_CREATE",
      "AVATAR_CREATE",
      "AVATAR_UPDATE",
      "AVATAR_SUGGEST",
      "OFFER_CREATE",
      "OFFER_UPDATE",
      "POSITIONING_CREATE",
      "POSITIONING_UPDATE"
    ]
  },
  {
    code: "DIGITAL_STRATEGIST",
    name: "Estrategista Digital",
    description: "Cargo de estrategia digital do Flow JL.",
    permissionCodes: ["LAUNCH_CREATE", "LAUNCH_READ", "MARKET_RESEARCH_CREATE", "COMPETITOR_RESEARCH_CREATE", "AVATAR_CREATE", "AVATAR_UPDATE", "AVATAR_SUGGEST", "OFFER_CREATE", "OFFER_UPDATE", "POSITIONING_CREATE", "POSITIONING_UPDATE"]
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

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
    code: "USER_UPDATE",
    name: "Atualizar dados basicos",
    description: "Permite atualizar dados basicos de colaboradores.",
    module: "user"
  },
  {
    code: "USER_ACTIVATE",
    name: "Ativar colaborador",
    description: "Permite ativar colaboradores inativos.",
    module: "user"
  },
  {
    code: "USER_DEACTIVATE",
    name: "Inativar colaborador",
    description: "Permite inativar colaboradores ativos.",
    module: "user"
  },
  {
    code: "USER_CHANGE_ROLE",
    name: "Alterar cargo do colaborador",
    description: "Permite alterar o cargo de um colaborador.",
    module: "user"
  },
  {
    code: "ROLE_READ",
    name: "Consultar cargos",
    description: "Permite consultar cargos disponiveis no core.",
    module: "role"
  },
  {
    code: "AUDIT_READ",
    name: "Consultar metadados de auditoria",
    description: "Permite consultar metadados de auditoria basica.",
    module: "audit"
  },
  {
    code: "PERMISSION_READ",
    name: "Consultar permissoes",
    description: "Permite consultar permissoes disponiveis no core.",
    module: "permission"
  },
  {
    code: "LAUNCH_CREATE",
    name: "Cadastrar lancamentos",
    description: "Permite cadastrar novos lancamentos da operacao.",
    module: "launch"
  },
  {
    code: "LAUNCH_READ",
    name: "Consultar lancamentos",
    description: "Permite consultar um lancamento e seus insumos estrategicos.",
    module: "launch"
  },
  {
    code: "MARKET_RESEARCH_CREATE",
    name: "Gerar pesquisa de mercado",
    description: "Permite gerar pesquisas de mercado com apoio de IA para um lancamento.",
    module: "strategy"
  },
  {
    code: "COMPETITOR_RESEARCH_CREATE",
    name: "Registrar pesquisa de concorrentes",
    description: "Permite registrar evidencias de concorrentes vinculadas a um lancamento.",
    module: "strategy"
  },
  {
    code: "AVATAR_CREATE",
    name: "Cadastrar avatar",
    description: "Permite cadastrar o avatar principal de um lancamento.",
    module: "strategy"
  },
  {
    code: "AVATAR_UPDATE",
    name: "Atualizar avatar",
    description: "Permite evoluir o avatar de um lancamento preservando o historico.",
    module: "strategy"
  },
  {
    code: "AVATAR_SUGGEST",
    name: "Gerar sugestoes de avatar",
    description: "Permite solicitar apoio de IA para complementar o avatar do publico.",
    module: "strategy"
  },
  {
    code: "OFFER_CREATE",
    name: "Cadastrar oferta",
    description: "Permite definir a oferta vigente de um lancamento.",
    module: "strategy"
  },
  {
    code: "OFFER_UPDATE",
    name: "Atualizar oferta",
    description: "Permite evoluir a oferta de um lancamento preservando o historico.",
    module: "strategy"
  },
  {
    code: "POSITIONING_CREATE",
    name: "Cadastrar posicionamento",
    description: "Permite definir o posicionamento vigente de um lancamento.",
    module: "strategy"
  },
  {
    code: "POSITIONING_UPDATE",
    name: "Atualizar posicionamento",
    description: "Permite evoluir o posicionamento de um lancamento preservando o historico.",
    module: "strategy"
  },
  {
    code: "EDITORIAL_LINE_CREATE",
    name: "Cadastrar linha editorial",
    description: "Permite definir a linha editorial vigente de um lancamento.",
    module: "strategy"
  },
  {
    code: "EDITORIAL_LINE_UPDATE",
    name: "Atualizar linha editorial",
    description: "Permite evoluir a linha editorial de um lancamento preservando o historico.",
    module: "strategy"
  },
  {
    code: "CONTENT_PLAN_CREATE",
    name: "Cadastrar plano de conteudo",
    description: "Permite definir o plano de conteudo vigente de um lancamento.",
    module: "strategy"
  },
  {
    code: "CONTENT_PLAN_UPDATE",
    name: "Atualizar plano de conteudo",
    description: "Permite evoluir o plano de conteudo de um lancamento preservando o historico.",
    module: "strategy"
  },
  {
    code: "SMART_SCHEDULE_CREATE",
    name: "Gerar cronograma inteligente",
    description: "Permite gerar o cronograma inteligente vigente de um lancamento.",
    module: "strategy"
  },
  {
    code: "SMART_SCHEDULE_UPDATE",
    name: "Atualizar cronograma inteligente",
    description: "Permite ajustar o cronograma inteligente de um lancamento preservando o historico.",
    module: "strategy"
  },
  {
    code: "EXPERT_APPROVAL_SUBMIT",
    name: "Submeter planejamento para aprovacao",
    description: "Permite enviar o planejamento estrategico de um lancamento para revisao do expert.",
    module: "strategy"
  },
  {
    code: "EXPERT_APPROVAL_DECIDE",
    name: "Decidir aprovacao do planejamento",
    description: "Permite ao expert aprovar ou reprovar o planejamento submetido.",
    module: "strategy"
  },
  {
    code: "CONTENT_IDEA_CREATE",
    name: "Cadastrar ideias de conteudo",
    description: "Permite registrar ideias reaproveitaveis para futuras pecas de conteudo.",
    module: "content"
  },
  {
    code: "CONTENT_IDEA_READ",
    name: "Consultar banco de ideias",
    description: "Permite listar e filtrar ideias de conteudo do banco de producao.",
    module: "content"
  },
  {
    code: "CONTENT_IDEA_DEACTIVATE",
    name: "Inativar ideias de conteudo",
    description: "Permite realizar exclusao logica de ideias de conteudo preservando historico.",
    module: "content"
  },
  {
    code: "REEL_CREATE",
    name: "Cadastrar reels",
    description: "Permite cadastrar reels com contexto minimo de producao e metadados essenciais.",
    module: "content"
  },
  {
    code: "REEL_UPDATE",
    name: "Atualizar reels",
    description: "Permite atualizar roteiro, legenda, aprovacao e status operacional de reels.",
    module: "content"
  },
  {
    code: "CAROUSEL_CREATE",
    name: "Cadastrar carrosseis",
    description: "Permite cadastrar carrosseis com contexto valido, cards e status operacional.",
    module: "content"
  },
  {
    code: "CAROUSEL_UPDATE",
    name: "Atualizar carrosseis",
    description: "Permite atualizar sequencia de mensagens, status e responsavel de carrosseis.",
    module: "content"
  },
  {
    code: "STORY_SEQUENCE_CREATE",
    name: "Cadastrar sequencias de stories",
    description: "Permite cadastrar sequencias de stories com contexto, blocos e CTA.",
    module: "content"
  },
  {
    code: "STORY_SEQUENCE_UPDATE",
    name: "Atualizar sequencias de stories",
    description: "Permite atualizar blocos, status, responsavel e horario de publicacao de stories.",
    module: "content"
  },
  {
    code: "EMAIL_CAMPAIGN_CREATE",
    name: "Cadastrar e-mails",
    description: "Permite cadastrar e-mails de lancamento com tipo, objetivo e CTA.",
    module: "content"
  },
  {
    code: "EMAIL_CAMPAIGN_READ",
    name: "Consultar e-mails",
    description: "Permite listar e filtrar e-mails do lancamento por tipo, status e contexto.",
    module: "content"
  },
  {
    code: "EMAIL_CAMPAIGN_DEACTIVATE",
    name: "Inativar e-mails",
    description: "Permite realizar exclusao logica de e-mails preservando historico.",
    module: "content"
  },
  {
    code: "YOUTUBE_CONTENT_CREATE",
    name: "Cadastrar pautas de YouTube",
    description: "Permite cadastrar pautas de videos longos relacionadas ao lancamento e linha editorial.",
    module: "content"
  },
  {
    code: "YOUTUBE_CONTENT_UPDATE",
    name: "Atualizar pautas de YouTube",
    description: "Permite atualizar roteiro, responsavel e status operacional de conteudos de YouTube.",
    module: "content"
  },
  {
    code: "YOUTUBE_CONTENT_DEACTIVATE",
    name: "Inativar pautas de YouTube",
    description: "Permite realizar exclusao logica de pautas de YouTube preservando historico.",
    module: "content"
  },
  {
    code: "COPYWRITING_GENERATE",
    name: "Gerar copywriting com IA",
    description: "Permite gerar sugestoes estruturadas de copywriting com base no contexto do lancamento.",
    module: "content"
  },
  {
    code: "COPYWRITING_CREATE",
    name: "Salvar copywriting gerado",
    description: "Permite persistir a copy estruturada para edicao humana posterior.",
    module: "content"
  },
  {
    code: "CONTENT_APPROVAL_REVIEW",
    name: "Mover conteudo para revisao",
    description: "Permite avancar ou devolver pecas na etapa de revisao editorial.",
    module: "content"
  },
  {
    code: "CONTENT_APPROVAL_EXPERT",
    name: "Mover conteudo para expert",
    description: "Permite avancar ou devolver pecas na etapa de analise do expert.",
    module: "content"
  },
  {
    code: "CONTENT_APPROVAL_APPROVE",
    name: "Aprovar conteudo",
    description: "Permite aprovar pecas apos a etapa de expert.",
    module: "content"
  },
  {
    code: "CONTENT_APPROVAL_PUBLISH",
    name: "Publicar conteudo aprovado",
    description: "Permite concluir o fluxo de pecas ja aprovadas e marca-las como publicadas.",
    module: "content"
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

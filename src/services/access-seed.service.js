import { Permission } from "../models/permission.model.js";
import { Role } from "../models/role.model.js";
import { auditService } from "./audit.service.js";
import { roleCatalog } from "./role-catalog.js";

const seedAuditTargetId = "core-access-seed";

const corePermissions = [
  {
    code: "AI_ASSISTANT_READ",
    name: "Consultar assistente interno",
    description: "Permite consultar conversas, historico, referencias e avisos do assistente interno.",
    module: "ai"
  },
  {
    code: "AI_ASSISTANT_WRITE",
    name: "Interagir com assistente interno",
    description: "Permite iniciar conversas, enviar mensagens e anexar contexto ao assistente interno.",
    module: "ai"
  },
  {
    code: "AI_ASSISTANT_ACTION",
    name: "Executar acoes do assistente interno",
    description: "Permite reaproveitar respostas da IA como conteudo, aprovacao ou tarefa operacional.",
    module: "ai"
  },
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
    code: "PLATFORM_SETTING_READ",
    name: "Consultar configuracoes da plataforma",
    description: "Permite consultar configuracoes globais nao sensiveis da plataforma.",
    module: "settings"
  },
  {
    code: "PLATFORM_SETTING_UPDATE",
    name: "Atualizar configuracoes da plataforma",
    description: "Permite alterar configuracoes globais editaveis com auditoria.",
    module: "settings"
  },
  {
    code: "SETTINGS_PERSONAL_READ",
    name: "Consultar configuracoes pessoais",
    description: "Permite consultar perfil, preferencias, tema e notificacoes do proprio usuario.",
    module: "settings"
  },
  {
    code: "SETTINGS_PERSONAL_UPDATE",
    name: "Atualizar configuracoes pessoais",
    description: "Permite atualizar perfil, preferencias, tema e notificacoes do proprio usuario.",
    module: "settings"
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
    code: "STRATEGY_CREATE",
    name: "Cadastrar estrategias digitais",
    description: "Permite iniciar um fluxo estruturado de estrategia digital por lancamento.",
    module: "strategy"
  },
  {
    code: "STRATEGY_READ",
    name: "Consultar estrategias digitais",
    description: "Permite listar e consultar o detalhe operacional das estrategias digitais.",
    module: "strategy"
  },
  {
    code: "STRATEGY_UPDATE",
    name: "Salvar etapas da estrategia digital",
    description: "Permite salvar drafts, comentarios e progresso da estrategia digital.",
    module: "strategy"
  },
  {
    code: "STRATEGY_DUPLICATE",
    name: "Duplicar estrategia digital",
    description: "Permite duplicar uma estrategia existente para reaproveitamento operacional.",
    module: "strategy"
  },
  {
    code: "STRATEGY_ARCHIVE",
    name: "Arquivar estrategia digital",
    description: "Permite arquivar estrategias descontinuadas sem perder historico.",
    module: "strategy"
  },
  {
    code: "STRATEGY_SUBMIT_APPROVAL",
    name: "Enviar estrategia para aprovacao",
    description: "Permite submeter uma estrategia digital concluida para aprovacao.",
    module: "strategy"
  },
  {
    code: "STRATEGY_GENERATE_AI",
    name: "Gerar conteudos com IA a partir da estrategia",
    description: "Permite obter sugestoes operacionais de conteudo a partir da estrategia registrada.",
    module: "strategy"
  },
  {
    code: "DASHBOARD_OVERVIEW_READ",
    name: "Consultar dashboard executivo",
    description: "Permite consultar o shell operacional, indicadores, notificacoes e busca global do dashboard.",
    module: "dashboard"
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
    code: "CONTENT_PRODUCTION_CREATE",
    name: "Cadastrar producoes de conteudo",
    description: "Permite iniciar pecas multicanal com editor estruturado e anexos.",
    module: "content"
  },
  {
    code: "CONTENT_PRODUCTION_READ",
    name: "Consultar producoes de conteudo",
    description: "Permite listar e consultar detalhe, versoes, historico e aprovador das pecas.",
    module: "content"
  },
  {
    code: "CONTENT_PRODUCTION_UPDATE",
    name: "Atualizar producoes de conteudo",
    description: "Permite editar pecas, gerar novas versoes e controlar status do fluxo.",
    module: "content"
  },
  {
    code: "CONTENT_PRODUCTION_ACTION",
    name: "Executar acoes de IA e aprovacao em conteudos",
    description: "Permite solicitar reescrita, resumo, variacao, adaptacao de canal e envio para aprovacao.",
    module: "content"
  },
  {
    code: "ASSET_LIBRARY_CREATE",
    name: "Cadastrar ativos reutilizaveis",
    description: "Permite registrar ativos reutilizaveis na biblioteca operacional.",
    module: "content"
  },
  {
    code: "ASSET_LIBRARY_READ",
    name: "Consultar biblioteca de ativos",
    description: "Permite pesquisar ativos por tipo, tag, lancamento ou status.",
    module: "content"
  },
  {
    code: "ASSET_LIBRARY_DEACTIVATE",
    name: "Inativar ativos reutilizaveis",
    description: "Permite realizar exclusao logica de ativos preservando historico.",
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
  },
  {
    code: "APPROVALS_MANAGEMENT_READ",
    name: "Consultar central de aprovacoes",
    description: "Permite consultar fila, abas, detalhes, comentarios, historico e comparacoes da central de aprovacoes.",
    module: "approvals"
  },
  {
    code: "APPROVALS_MANAGEMENT_DECIDE",
    name: "Decidir na central de aprovacoes",
    description: "Permite iniciar decisoes de aprovar, reprovar ou solicitar ajuste na central de aprovacoes, respeitando as permissoes do fluxo base.",
    module: "approvals"
  },
  {
    code: "STRATEGIST_DASHBOARD_READ",
    name: "Consultar dashboard da estrategista",
    description: "Permite consultar indicadores consolidados do modulo estrategico por lancamento.",
    module: "strategy"
  },
  {
    code: "PUBLICATION_CREATE",
    name: "Cadastrar publicacoes",
    description: "Permite registrar publicacoes planejadas para conteudos aprovados.",
    module: "content"
  },
  {
    code: "PUBLICATION_READ",
    name: "Consultar publicacoes",
    description: "Permite consultar publicacoes por periodo, canal, lancamento e status.",
    module: "content"
  },
  {
    code: "PUBLICATION_UPDATE",
    name: "Atualizar publicacoes",
    description: "Permite atualizar agenda, responsavel e situacao operacional de publicacoes.",
    module: "content"
  },
  {
    code: "EDITORIAL_CALENDAR_CREATE",
    name: "Cadastrar itens no calendario editorial",
    description: "Permite inserir itens agendados no calendario editorial com vinculo a conteudo base.",
    module: "content"
  },
  {
    code: "EDITORIAL_CALENDAR_READ",
    name: "Consultar calendario editorial",
    description: "Permite consultar o calendario editorial por periodo, canal e lancamento.",
    module: "content"
  },
  {
    code: "EDITORIAL_CALENDAR_UPDATE",
    name: "Atualizar agenda editorial",
    description: "Permite ajustar data, hora, canal e responsavel de itens do calendario editorial.",
    module: "content"
  },
  {
    code: "SOCIAL_MEDIA_READ",
    name: "Consultar painel de social media",
    description: "Permite visualizar calendario editorial, grade semanal, feed visual e buckets operacionais das publicacoes.",
    module: "social-media"
  },
  {
    code: "SOCIAL_MEDIA_SCHEDULE",
    name: "Planejar publicacao social",
    description: "Permite definir rede, data, hora, preview e fluxo operacional de publicacoes de redes sociais.",
    module: "social-media"
  },
  {
    code: "SOCIAL_MEDIA_METRICS_UPDATE",
    name: "Registrar desempenho social",
    description: "Permite registrar URL publicada e metricas simuladas de desempenho de publicacoes concluidas.",
    module: "social-media"
  },
  {
    code: "PRODUCTION_CHECKLIST_CREATE",
    name: "Executar checklist de producao",
    description: "Permite iniciar checklists de producao para conteudos aprovados.",
    module: "content"
  },
  {
    code: "PRODUCTION_CHECKLIST_READ",
    name: "Consultar checklists de producao",
    description: "Permite consultar progresso e historico de checklists de producao.",
    module: "content"
  },
  {
    code: "PRODUCTION_CHECKLIST_UPDATE",
    name: "Atualizar checklist de producao",
    description: "Permite marcar itens obrigatorios e salvar progresso parcial ou total.",
    module: "content"
  },
  {
    code: "PRODUCTION_CHECKLIST_REOPEN",
    name: "Reabrir checklist de producao",
    description: "Permite reabrir checklists concluidos mantendo historico auditavel.",
    module: "content"
  },
  {
    code: "CONTENT_STATUS_UPDATE",
    name: "Atualizar status de conteudo",
    description: "Permite alterar o status operacional de pecas seguindo o fluxo permitido.",
    module: "content"
  },
  {
    code: "CONTENT_STATUS_READ",
    name: "Consultar historico de status",
    description: "Permite consultar o historico auditavel de mudancas de status de conteudo.",
    module: "content"
  },
  {
    code: "EXTERNAL_INTEGRATION_CREATE",
    name: "Cadastrar integracoes externas",
    description: "Permite preparar configuracoes futuras de integracao com Meta e YouTube.",
    module: "content"
  },
  {
    code: "EXTERNAL_INTEGRATION_READ",
    name: "Consultar integracoes externas",
    description: "Permite consultar integracoes externas sem expor credenciais sensiveis.",
    module: "content"
  },
  {
    code: "EXTERNAL_INTEGRATION_UPDATE",
    name: "Atualizar integracoes externas",
    description: "Permite atualizar identificadores externos, estado de sincronizacao e credenciais protegidas.",
    module: "content"
  },
  {
    code: "EXTERNAL_PUBLICATION_LINK_CREATE",
    name: "Cadastrar vinculos externos de publicacao",
    description: "Permite vincular publicacoes internas a identificadores externos de Meta ou YouTube.",
    module: "content"
  },
  {
    code: "EXTERNAL_PUBLICATION_LINK_READ",
    name: "Consultar vinculos externos de publicacao",
    description: "Permite consultar vinculos externos e estados de sincronizacao de publicacoes.",
    module: "content"
  },
  {
    code: "TRAFFIC_CAMPAIGN_CREATE",
    name: "Cadastrar campanhas de trafego",
    description: "Permite cadastrar campanhas pagas vinculadas a lancamentos.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CAMPAIGN_READ",
    name: "Consultar campanhas de trafego",
    description: "Permite consultar campanhas pagas por lancamento, canal, status e ativacao.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CAMPAIGN_UPDATE",
    name: "Atualizar campanhas de trafego",
    description: "Permite atualizar objetivo, periodo, status e metadados auditaveis de campanhas.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CAMPAIGN_DEACTIVATE",
    name: "Inativar campanhas de trafego",
    description: "Permite realizar exclusao logica de campanhas pagas preservando historico.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CREATIVE_CREATE",
    name: "Cadastrar criativos de trafego",
    description: "Permite cadastrar criativos vinculados a campanhas de trafego.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CREATIVE_READ",
    name: "Consultar criativos de trafego",
    description: "Permite consultar criativos por campanha, lancamento, formato, status e classificacao.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CREATIVE_UPDATE",
    name: "Atualizar criativos de trafego",
    description: "Permite atualizar situacao, classificacao e desempenho de criativos de trafego.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CREATIVE_DEACTIVATE",
    name: "Inativar criativos de trafego",
    description: "Permite realizar exclusao logica de criativos preservando historico.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_PIXEL_CREATE",
    name: "Cadastrar pixels de trafego",
    description: "Permite cadastrar pixels vinculados a lancamentos ou campanhas.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_PIXEL_READ",
    name: "Consultar pixels de trafego",
    description: "Permite consultar pixels sem expor segredos ou tokens internos.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_PIXEL_UPDATE",
    name: "Atualizar pixels de trafego",
    description: "Permite atualizar finalidade, status e credenciais protegidas de pixels.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_PIXEL_LINK",
    name: "Vincular pixels de trafego",
    description: "Permite vincular pixels a campanhas e eventos de conversao.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_PIXEL_DEACTIVATE",
    name: "Inativar pixels de trafego",
    description: "Permite realizar exclusao logica de pixels preservando historico.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_AUDIENCE_CREATE",
    name: "Cadastrar publicos de trafego",
    description: "Permite cadastrar publicos vinculados a lancamentos ou campanhas.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_AUDIENCE_READ",
    name: "Consultar publicos de trafego",
    description: "Permite consultar publicos por lancamento, campanha, status e ativacao.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_AUDIENCE_UPDATE",
    name: "Atualizar publicos de trafego",
    description: "Permite atualizar estrategia, status e segmentacao de publicos.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_AUDIENCE_DEACTIVATE",
    name: "Inativar publicos de trafego",
    description: "Permite realizar exclusao logica de publicos preservando historico.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CONVERSION_EVENT_CREATE",
    name: "Cadastrar eventos de conversao",
    description: "Permite cadastrar eventos de conversao vinculados a lancamentos ou campanhas.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CONVERSION_EVENT_READ",
    name: "Consultar eventos de conversao",
    description: "Permite consultar eventos por lancamento, campanha, pixel, origem, status e ativacao.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CONVERSION_EVENT_UPDATE",
    name: "Atualizar eventos de conversao",
    description: "Permite atualizar objetivo, origem, status e datas associadas de eventos.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CONVERSION_EVENT_LINK",
    name: "Vincular eventos de conversao",
    description: "Permite vincular eventos de conversao a campanhas e pixels.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_CONVERSION_EVENT_DEACTIVATE",
    name: "Inativar eventos de conversao",
    description: "Permite realizar exclusao logica de eventos preservando historico.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_REPORT_READ",
    name: "Consultar relatorios de trafego",
    description: "Permite consultar relatorios consolidados de trafego por lancamento, periodo e campanha.",
    module: "traffic"
  },
  {
    code: "TRAFFIC_ROI_READ",
    name: "Consultar ROI de trafego",
    description: "Permite consultar ROI consolidado de trafego por lancamento, periodo e campanha.",
    module: "traffic"
  },
  {
    code: "REPORTS_READ",
    name: "Consultar relatorios consolidados",
    description: "Permite consultar relatorios executivos e operacionais com filtros, tabelas e graficos.",
    module: "reports"
  },
  {
    code: "REPORTS_EXPORT",
    name: "Exportar relatorios consolidados",
    description: "Permite exportar ou imprimir visoes analiticas do modulo de relatorios.",
    module: "reports"
  },
  {
    code: "REPORTS_SAVE_VIEW",
    name: "Salvar visoes de relatorios",
    description: "Permite salvar filtros uteis e dashboards personalizados no modulo de relatorios.",
    module: "reports"
  },
  {
    code: "CLASS_SCHEDULE_CREATE",
    name: "Cadastrar aulas agendadas",
    description: "Permite cadastrar aulas vinculadas a operacao de um lancamento.",
    module: "operations"
  },
  {
    code: "CLASS_SCHEDULE_READ",
    name: "Consultar agenda de aulas",
    description: "Permite consultar aulas por lancamento, periodo, responsavel, status e ativacao.",
    module: "operations"
  },
  {
    code: "CLASS_SCHEDULE_UPDATE",
    name: "Atualizar aulas agendadas",
    description: "Permite alterar data, responsavel, status e dados operacionais de aulas.",
    module: "operations"
  },
  {
    code: "CLASS_SCHEDULE_DEACTIVATE",
    name: "Inativar aulas agendadas",
    description: "Permite realizar exclusao logica de aulas preservando historico.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_SCHEDULE_CREATE",
    name: "Cadastrar atividades operacionais",
    description: "Permite cadastrar atividades do cronograma operacional vinculadas a um lancamento.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_SCHEDULE_READ",
    name: "Consultar cronograma operacional",
    description: "Permite consultar calendario, lista, kanban e timeline com filtros por responsavel, area, status e tipo.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_SCHEDULE_UPDATE",
    name: "Atualizar atividades operacionais",
    description: "Permite atualizar detalhe, checklist, dependencias, anexos e comentarios de atividades operacionais.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_SCHEDULE_REPLAN",
    name: "Replanejar cronograma operacional",
    description: "Permite reorganizar atividades em lote com simulacao de drag and drop preservando regras de dependencias.",
    module: "operations"
  },
  {
    code: "LIVE_EVENT_CREATE",
    name: "Cadastrar eventos ao vivo",
    description: "Permite cadastrar eventos ao vivo vinculados a operacao de um lancamento.",
    module: "operations"
  },
  {
    code: "LIVE_EVENT_READ",
    name: "Consultar eventos ao vivo",
    description: "Permite consultar eventos ao vivo por lancamento, periodo, canal, responsavel e status.",
    module: "operations"
  },
  {
    code: "LIVE_EVENT_UPDATE",
    name: "Atualizar eventos ao vivo",
    description: "Permite alterar horario, canal, responsavel, status e dados operacionais de eventos ao vivo.",
    module: "operations"
  },
  {
    code: "LIVE_EVENT_DEACTIVATE",
    name: "Inativar eventos ao vivo",
    description: "Permite realizar exclusao logica de eventos ao vivo preservando historico.",
    module: "operations"
  },
  {
    code: "DISCORD_OPERATION_CREATE",
    name: "Cadastrar operacoes de Discord",
    description: "Permite cadastrar tarefas operacionais do Discord vinculadas a um lancamento.",
    module: "operations"
  },
  {
    code: "DISCORD_OPERATION_READ",
    name: "Consultar operacoes de Discord",
    description: "Permite consultar tarefas do Discord por lancamento, tipo, responsavel, prazo e status.",
    module: "operations"
  },
  {
    code: "DISCORD_OPERATION_UPDATE",
    name: "Atualizar operacoes de Discord",
    description: "Permite atualizar status, observacoes, responsavel e prazo de tarefas do Discord.",
    module: "operations"
  },
  {
    code: "DISCORD_OPERATION_DEACTIVATE",
    name: "Inativar operacoes de Discord",
    description: "Permite realizar exclusao logica de tarefas do Discord preservando historico.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_EMAIL_CREATE",
    name: "Cadastrar e-mails operacionais",
    description: "Permite cadastrar acoes operacionais de e-mail marketing vinculadas a um lancamento.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_EMAIL_READ",
    name: "Consultar e-mails operacionais",
    description: "Permite consultar acoes operacionais de e-mail por lancamento, responsavel, prazo e status.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_EMAIL_UPDATE",
    name: "Atualizar e-mails operacionais",
    description: "Permite atualizar status, prazo, responsavel e observacoes de e-mails operacionais.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_EMAIL_DEACTIVATE",
    name: "Inativar e-mails operacionais",
    description: "Permite realizar exclusao logica de acoes operacionais de e-mail preservando historico.",
    module: "operations"
  },
  {
    code: "STUDENT_CREATE",
    name: "Cadastrar alunos",
    description: "Permite cadastrar alunos vinculados a produtos, lancamentos e operacao.",
    module: "operations"
  },
  {
    code: "STUDENT_READ",
    name: "Consultar alunos",
    description: "Permite consultar alunos e informacoes operacionais de entrega.",
    module: "operations"
  },
  {
    code: "STUDENT_UPDATE",
    name: "Atualizar alunos",
    description: "Permite atualizar dados operacionais, status e contexto de alunos.",
    module: "operations"
  },
  {
    code: "STUDENT_DEACTIVATE",
    name: "Inativar alunos",
    description: "Permite realizar exclusao logica de alunos preservando historico.",
    module: "operations"
  },
  {
    code: "SUPPORT_TICKET_CREATE",
    name: "Registrar atendimentos de suporte",
    description: "Permite registrar atendimentos de suporte vinculados a aluno ou lancamento.",
    module: "operations"
  },
  {
    code: "SUPPORT_TICKET_READ",
    name: "Consultar atendimentos de suporte",
    description: "Permite consultar atendimentos, responsaveis, status e historico de suporte.",
    module: "operations"
  },
  {
    code: "SUPPORT_TICKET_UPDATE",
    name: "Atualizar atendimentos de suporte",
    description: "Permite atualizar status, prioridade, observacoes e interacoes de suporte.",
    module: "operations"
  },
  {
    code: "SUPPORT_TICKET_DEACTIVATE",
    name: "Inativar atendimentos de suporte",
    description: "Permite realizar exclusao logica de atendimentos de suporte preservando historico.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_CHECKLIST_CREATE",
    name: "Registrar checklists operacionais",
    description: "Permite registrar checklists de rotinas e eventos operacionais.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_CHECKLIST_READ",
    name: "Consultar checklists operacionais",
    description: "Permite consultar progresso, itens e historico de checklists operacionais.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_CHECKLIST_UPDATE",
    name: "Executar checklists operacionais",
    description: "Permite marcar itens, atualizar progresso e concluir checklists operacionais.",
    module: "operations"
  },
  {
    code: "OPERATIONAL_CHECKLIST_DEACTIVATE",
    name: "Inativar checklists operacionais",
    description: "Permite realizar exclusao logica de checklists operacionais preservando historico.",
    module: "operations"
  },
  {
    code: "AI_SCHEDULE_GENERATE",
    name: "Gerar cronogramas com IA",
    description: "Permite gerar propostas estruturadas de cronograma com IA para revisao humana.",
    module: "corporate-ai"
  },
  {
    code: "AI_SCHEDULE_CREATE",
    name: "Salvar cronogramas gerados por IA",
    description: "Permite persistir cronogramas gerados por IA para edicao e aprovacao posterior.",
    module: "corporate-ai"
  },
  {
    code: "AI_SCHEDULE_READ",
    name: "Consultar cronogramas gerados por IA",
    description: "Permite consultar cronogramas gerados por IA e seus metadados seguros.",
    module: "corporate-ai"
  },
  {
    code: "AI_BRAND_MATERIAL_GENERATE",
    name: "Gerar materiais no estilo da marca",
    description: "Permite gerar roteiros, copies e e-mails com IA usando contexto de marca.",
    module: "corporate-ai"
  },
  {
    code: "AI_BRAND_MATERIAL_CREATE",
    name: "Salvar materiais gerados por IA",
    description: "Permite persistir materiais de IA versionaveis para edicao humana.",
    module: "corporate-ai"
  },
  {
    code: "AI_BRAND_MATERIAL_READ",
    name: "Consultar materiais gerados por IA",
    description: "Permite consultar materiais gerados por IA e seus metadados seguros.",
    module: "corporate-ai"
  },
  {
    code: "AI_HISTORICAL_CONTENT_CREATE",
    name: "Cadastrar conteudos historicos",
    description: "Permite cadastrar conteudos historicos classificados por desempenho.",
    module: "corporate-ai"
  },
  {
    code: "AI_HISTORICAL_CONTENT_READ",
    name: "Consultar acervo historico estrategico",
    description: "Permite consultar conteudos historicos relevantes sem expor dados sensiveis.",
    module: "corporate-ai"
  },
  {
    code: "AI_HISTORICAL_CONTENT_RECOMMEND",
    name: "Recomendar reaproveitamento historico",
    description: "Permite gerar recomendacoes de reaproveitamento com base no acervo historico.",
    module: "corporate-ai"
  },
  {
    code: "AI_HISTORICAL_CONTENT_DEACTIVATE",
    name: "Inativar conteudos historicos",
    description: "Permite realizar exclusao logica de itens do acervo historico.",
    module: "corporate-ai"
  },
  {
    code: "AI_METRIC_INSIGHT_GENERATE",
    name: "Gerar sugestoes por metricas historicas",
    description: "Permite gerar sugestoes estruturadas com base em metricas historicas auditaveis.",
    module: "corporate-ai"
  },
  {
    code: "AI_METRIC_INSIGHT_READ",
    name: "Consultar sugestoes por metricas historicas",
    description: "Permite consultar sugestoes geradas e sua base historica segura.",
    module: "corporate-ai"
  },
  {
    code: "AI_TEAM_AUTOMATION_CREATE",
    name: "Configurar automacoes recorrentes",
    description: "Permite configurar automacoes recorrentes com gatilho, regra e acao segura.",
    module: "corporate-ai"
  },
  {
    code: "AI_TEAM_AUTOMATION_READ",
    name: "Consultar automacoes recorrentes",
    description: "Permite consultar automacoes recorrentes e seus resultados seguros.",
    module: "corporate-ai"
  },
  {
    code: "AI_TEAM_AUTOMATION_UPDATE",
    name: "Ativar ou inativar automacoes recorrentes",
    description: "Permite ativar ou inativar automacoes recorrentes com controle seguro.",
    module: "corporate-ai"
  },
  {
    code: "AI_TEAM_AUTOMATION_EXECUTE",
    name: "Executar automacoes recorrentes",
    description: "Permite executar automacoes ativas respeitando gatilho, regra e contexto.",
    module: "corporate-ai"
  }
];

function getWriteCount(result) {
  return (result?.modifiedCount ?? 0) + (result?.upsertedCount ?? 0);
}

class AccessSeedService {
  async ensureCoreAccessSeed() {
    let permissionWrites = 0;
    let roleWrites = 0;
    let rolePermissionWrites = 0;

    for (const permission of corePermissions) {
      const result = await Permission.updateOne(
        { code: permission.code },
        {
          $setOnInsert: {
            code: permission.code
          },
          $set: {
            name: permission.name,
            description: permission.description,
            module: permission.module,
            active: true
          }
        },
        { upsert: true }
      );
      permissionWrites += getWriteCount(result);
    }

    const permissions = await Permission.find(
      {
        code: {
          $in: corePermissions.map((permission) => permission.code)
        }
      },
      { _id: 1, code: 1 }
    ).sort({ code: 1 });

    for (const role of roleCatalog) {
      const permissionIds = permissions
        .filter((permission) => role.permissionCodes.includes(permission.code))
        .map((permission) => permission._id);

      const roleResult = await Role.updateOne(
        { code: role.code },
        {
          $setOnInsert: {
            code: role.code,
            permissionIds
          },
          $set: {
            name: role.name,
            description: role.description,
            active: true
          }
        },
        { upsert: true }
      );
      roleWrites += getWriteCount(roleResult);

      const matrixResult = await Role.updateOne(
        { code: role.code },
        {
          $addToSet: {
            permissionIds: {
              $each: permissionIds
            }
          }
        }
      );
      rolePermissionWrites += getWriteCount(matrixResult);
    }

    const totalWrites = permissionWrites + roleWrites + rolePermissionWrites;

    if (totalWrites > 0) {
      await auditService.record({
        actorUserId: null,
        action: "CORE_ACCESS_SEED_APPLIED",
        targetType: "CORE_ACCESS_SEED",
        targetId: seedAuditTargetId,
        context: {
          permissionCatalogSize: corePermissions.length,
          roleCatalogSize: roleCatalog.length,
          permissionWrites,
          roleWrites,
          rolePermissionWrites,
          preservesManualRolePermissions: true
        }
      });
    }

    return {
      permissionCatalogSize: corePermissions.length,
      roleCatalogSize: roleCatalog.length,
      permissionWrites,
      roleWrites,
      rolePermissionWrites,
      auditRecorded: totalWrites > 0
    };
  }
}

export const accessSeedService = new AccessSeedService();
export { corePermissions };

# Flow JL API

Estrutura inicial da API Rest do projeto Flow JL, construída com JavaScript, Express, autenticação JWT e conexão com MongoDB.

## Objetivo desta base

Esta entrega prepara a fundação da API para evoluir a partir das User Stories do Jira, sem ainda entrar no ciclo completo de funcionalidades do produto.

Ela já deixa o projeto pronto para:

- autenticação com JWT
- persistência com MongoDB
- documentação com Swagger
- arquitetura em camadas
- bootstrap controlado do primeiro administrador
- futura integração com GitHub Actions
- futuro deploy em Vercel

## Stack

- Node.js 20+
- Express
- MongoDB com Mongoose
- JWT com `jsonwebtoken`
- Hash de senha com `bcryptjs`
- Swagger UI
- Validação com `zod`

## Arquitetura

```text
src
├── config
├── controllers
├── middleware
├── models
├── routes
├── services
├── utils
├── app.js
└── server.js
```

## Endpoints iniciais

- `GET /health`
- `GET /docs`
- `GET /api/v1`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/audits`
- `POST /api/v1/assets`
- `GET /api/v1/assets`
- `DELETE /api/v1/assets/:assetId`
- `POST /api/v1/content-ideas`
- `GET /api/v1/content-ideas`
- `DELETE /api/v1/content-ideas/:ideaId`
- `POST /api/v1/content-approvals/:contentType/:contentId/status`
- `POST /api/v1/content-statuses/:contentType/:contentId`
- `GET /api/v1/content-statuses/:contentType/:contentId/history`
- `POST /api/v1/carousels`
- `PUT /api/v1/carousels/:carouselId`
- `POST /api/v1/reels`
- `PUT /api/v1/reels/:reelId`
- `POST /api/v1/stories`
- `PUT /api/v1/stories/:sequenceId`
- `POST /api/v1/emails`
- `GET /api/v1/emails`
- `DELETE /api/v1/emails/:emailId`
- `POST /api/v1/copywritings`
- `POST /api/v1/publications`
- `GET /api/v1/publications`
- `PUT /api/v1/publications/:publicationId`
- `POST /api/v1/production-checklists`
- `GET /api/v1/production-checklists`
- `PUT /api/v1/production-checklists/:checklistId`
- `POST /api/v1/production-checklists/:checklistId/reopen`
- `POST /api/v1/external-publication/integrations`
- `GET /api/v1/external-publication/integrations`
- `PUT /api/v1/external-publication/integrations/:integrationId`
- `POST /api/v1/external-publication/publication-links`
- `GET /api/v1/external-publication/publication-links`
- `POST /api/v1/youtube-contents`
- `PUT /api/v1/youtube-contents/:contentId`
- `DELETE /api/v1/youtube-contents/:contentId`
- `GET /api/v1/dashboards/strategist`
- `POST /api/v1/editorial-calendar`
- `GET /api/v1/editorial-calendar`
- `PUT /api/v1/editorial-calendar/:itemId`
- `POST /api/v1/launches`
- `GET /api/v1/launches/:launchId`
- `POST /api/v1/launches/:launchId/market-researches`
- `POST /api/v1/launches/:launchId/copywritings/generate`
- `POST /api/v1/launches/:launchId/competitor-researches`
- `POST /api/v1/launches/:launchId/avatars`
- `PUT /api/v1/launches/:launchId/avatars`
- `POST /api/v1/launches/:launchId/avatar-suggestions`
- `POST /api/v1/launches/:launchId/offers`
- `PUT /api/v1/launches/:launchId/offers`
- `POST /api/v1/launches/:launchId/positionings`
- `PUT /api/v1/launches/:launchId/positionings`
- `POST /api/v1/launches/:launchId/editorial-lines`
- `PUT /api/v1/launches/:launchId/editorial-lines`
- `POST /api/v1/launches/:launchId/content-plans`
- `PUT /api/v1/launches/:launchId/content-plans`
- `POST /api/v1/launches/:launchId/smart-schedules`
- `PUT /api/v1/launches/:launchId/smart-schedules`
- `POST /api/v1/launches/:launchId/expert-approvals`
- `POST /api/v1/launches/:launchId/expert-approvals/decision`
- `GET /api/v1/roles`
- `GET /api/v1/roles/:id`
- `POST /api/v1/roles`
- `PUT /api/v1/roles/:code`
- `GET /api/v1/roles/:code/permissions`
- `PUT /api/v1/roles/:code/permissions`
- `POST /api/v1/users/bootstrap-admin`
- `POST /api/v1/users`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `GET /api/v1/users/me`
- `POST /api/v1/profiles`
- `PUT /api/v1/profiles/:id`
- `GET /api/v1/profiles`
- `PUT /api/v1/users/:id`

## Variáveis de ambiente

Use o arquivo `.env.example` como base para criar o seu `.env`.

Variáveis disponíveis:

- `NODE_ENV`
- `PORT`
- `BASE_URL`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`

## Scripts

```bash
pnpm dev
```

Inicia a API em modo observação e reinicia automaticamente quando arquivos forem alterados.

```bash
pnpm start
```

Inicia a API em modo estático.

```bash
pnpm test
```

Executa os testes básicos da aplicação.

```bash
pnpm db:sync
```

Conecta no MongoDB configurado em `MONGODB_URI`, cria coleções e índices dos models registrados e aplica o seed idempotente de cargos e permissões.

## Como rodar localmente

1. Instale as dependências:

```bash
pnpm install
```

2. Crie o arquivo `.env` com base no `.env.example`

3. Garanta que o MongoDB esteja acessível pela `MONGODB_URI`

4. Inicie a API:

```bash
pnpm dev
```

## Swagger

A documentação fica disponível em:

- [Swagger YAML](/Users/otnielmata/projects/flow-jl/docs/swagger.yaml:1)
- `GET /docs`

## Observações importantes

- Na primeira subida da API, o catálogo base de cargos e permissões do Core é semeado de forma idempotente.
- O primeiro administrador deve ser criado explicitamente via `POST /api/v1/users/bootstrap-admin`.
- O cadastro de colaboradores via `POST /api/v1/users` exige autenticação com JWT válido e perfil administrativo.
- A consulta de colaboradores usa permissões de papel: `USER_LIST` para listagem e `USER_READ` para consulta individual.
- A manutenção de colaboradores via `PUT /api/v1/users/:id` exige as permissões adequadas por ação: `USER_UPDATE`, `USER_CHANGE_ROLE`, `USER_ACTIVATE` e `USER_DEACTIVATE`.
- A API rejeita auto-inativação e também impede a inativação do último administrador ativo.
- A reativação de colaborador reaproveita `PUT /api/v1/users/:id` com `status = ACTIVE`, limpa `deactivatedAt` e retorna regra clara quando o usuário já está ativo.
- A inativação de colaborador reaproveita `PUT /api/v1/users/:id` com `status = INACTIVE`, preenche `deactivatedAt` e bloqueia a ação para a própria conta e para o último administrador ativo.
- A troca de cargo do colaborador reaproveita `PUT /api/v1/users/:id` com `roleId`, exige um cargo existente e ativo e registra a mudança com autor e data.
- A estrutura de cargos do Flow JL é fixa nesta etapa e a manutenção aceita apenas códigos do catálogo inicial.
- A listagem de cargos via `GET /api/v1/roles` retorna apenas os cargos ativos do catálogo inicial.
- A consulta individual de cargo via `GET /api/v1/roles/:id` retorna somente os campos públicos e os códigos de permissões associadas, quando existirem.
- O mapeamento de permissões por cargo via `PUT /api/v1/roles/:code/permissions` rejeita códigos inexistentes e passa a influenciar diretamente a autorização dos endpoints protegidos.
- A trilha de auditoria inicial pode ser consultada em `GET /api/v1/audits` por usuários com `AUDIT_READ` e registra criação, atualização, inativação, mudança de cargo e autenticação bem-sucedida.
- O banco de ideias pode ser gerenciado via `POST`, `GET` e `DELETE /api/v1/content-ideas`, aceita vínculo opcional com lançamento, filtra por `launchId`, `objective`, `status` e `active`, preserva autoria e histórico por exclusão lógica, e audita criação e inativação.
- Os carrosséis podem ser produzidos via `POST` e `PUT /api/v1/carousels`, exigem vínculo com lançamento ou plano de conteúdo, mantêm UUID, cards estruturados, status operacional, revisão auditável e responsável pela peça, e permitem evolução do conteúdo sem perder trilha de auditoria.
- Os reels podem ser produzidos via `POST` e `PUT /api/v1/reels`, exigem contexto mínimo de lançamento ou plano de conteúdo, mantêm status operacional, trilha de aprovação compatível com o módulo, datas em UTC quando houver agendamento, e auditoria nas alterações de roteiro, legenda e status.
- As sequências de stories podem ser produzidas via `POST` e `PUT /api/v1/stories`, aceitam vínculo com lançamento ou cronograma inteligente, mantêm blocos ordenados, status de produção, responsável e prazo de publicação em UTC, e registram auditoria nas alterações.
- Os e-mails podem ser gerenciados via `POST`, `GET` e `DELETE /api/v1/emails`, exigem lançamento válido, tipo, assunto, objetivo e status inicial, permitem filtros por tipo, lançamento e status, respeitam trilha de revisão/aprovação, retornam horário planejado em UTC e usam exclusão lógica.
- O copywriting com IA pode ser gerado via `POST /api/v1/launches/:launchId/copywritings/generate` e persistido via `POST /api/v1/copywritings`, exige briefing mínimo e contexto estratégico suficiente do lançamento, retorna uma sugestão estruturada revisável por humano, não expõe prompts internos e registra auditoria na geração e no salvamento.
- As publicações podem ser gerenciadas via `POST`, `GET` e `PUT /api/v1/publications`, exigem vínculo com conteúdo válido, aceitam agenda em UTC com canal e responsável, sincronizam o estado operacional do conteúdo quando entram como agendadas ou publicadas, e impedem publicação sem aprovação prévia.
- Os checklists de produção podem ser executados via `POST`, `GET`, `PUT` e `POST /api/v1/production-checklists/:checklistId/reopen`, exigem conteúdo aprovado, usam itens configuráveis por tipo de conteúdo, salvam conclusão parcial ou total, bloqueiam conclusão final com itens obrigatórios pendentes e preservam histórico auditável.
- O status operacional de conteúdo pode ser atualizado via `POST /api/v1/content-statuses/:contentType/:contentId` e consultado em `GET /api/v1/content-statuses/:contentType/:contentId/history`, respeita transições permitidas por tipo de peça, bloqueia alteração de conteúdo publicado, exige checklist concluído antes de publicação e registra histórico auditável.
- A preparação de integração futura com Meta e YouTube pode ser gerenciada via `/api/v1/external-publication`, armazenando credenciais protegidas, identificadores externos e estados de sincronização sem expor tokens em consultas, além de permitir vínculos auditáveis entre publicações internas e IDs externos.
- As aprovações de conteúdo podem ser gerenciadas via `POST /api/v1/content-approvals/:contentType/:contentId/status`, respeitam a ordem `CREATED -> REVIEW -> EXPERT -> APPROVED -> PUBLISHED`, exigem permissões por etapa, registram observações de aprovação ou reprovação no histórico e impedem publicação antes da aprovação.
- A biblioteca de ativos pode ser gerenciada via `POST`, `GET` e `DELETE /api/v1/assets`, permite ativos globais ou vinculados a lançamentos, suporta busca por tipo, tag, lançamento e status, retorna UUID e datas em UTC e preserva histórico por exclusão lógica.
- Os conteúdos de YouTube podem ser gerenciados via `POST`, `PUT` e `DELETE /api/v1/youtube-contents`, exigem lançamento e linha editorial vigente, mantêm pauta, roteiro, responsável e status rastreável, retornam horários de gravação/publicação em UTC e preservam histórico por exclusão lógica.
- O dashboard da estrategista pode ser consultado em `GET /api/v1/dashboards/strategist`, aceita filtro opcional por `launchId`, consolida progresso, pendências, atrasos e status por etapa a partir do estado atual dos módulos estratégicos, e exige a permissão `STRATEGIST_DASHBOARD_READ`.
- O calendário editorial pode ser gerenciado via `POST`, `GET` e `PUT /api/v1/editorial-calendar`, exige conteúdo base válido com contexto de lançamento, organiza a consulta por período, data, hora e canal em UTC, sincroniza o agendamento com o conteúdo quando aplicável e registra auditoria nas alterações.
- O cadastro de lançamentos via `POST /api/v1/launches` exige `LAUNCH_CREATE`, persiste marcos operacionais em UTC e rejeita duplicidade ativa com a mesma combinação de nome, produto e período.
- A consulta de lançamentos via `GET /api/v1/launches/:launchId` exige `LAUNCH_READ` e retorna o histórico versionado das pesquisas de mercado já associadas.
- A geração de pesquisa de mercado via `POST /api/v1/launches/:launchId/market-researches` exige `MARKET_RESEARCH_CREATE`, depende de um lançamento existente, marca o resultado para revisão humana e não expõe detalhes internos do mecanismo de geração.
- O registro de pesquisa de concorrentes via `POST /api/v1/launches/:launchId/competitor-researches` exige `COMPETITOR_RESEARCH_CREATE`, agrupa múltiplas evidências por concorrente e a consulta do lançamento devolve esse material organizado por canal e data.
- O avatar do público pode ser cadastrado e evoluído via `POST` e `PUT /api/v1/launches/:launchId/avatars`, preserva histórico versionado e registra auditoria de alteração.
- As sugestões de avatar via `POST /api/v1/launches/:launchId/avatar-suggestions` exigem `AVATAR_SUGGEST`, retornam estrutura complementar revisável por humano e não expõem detalhes internos do mecanismo de IA.
- A oferta do lançamento pode ser registrada e atualizada via `POST` e `PUT /api/v1/launches/:launchId/offers`, mantém uma versão vigente por lançamento, relaciona a versão atual do avatar quando disponível e preserva o histórico anterior.
- O posicionamento do lançamento pode ser registrado e atualizado via `POST` e `PUT /api/v1/launches/:launchId/positionings`, mantém uma versão vigente com autor e data da última alteração, relaciona a versão atual da oferta quando disponível e preserva o histórico por exclusão lógica.
- A linha editorial do lançamento pode ser registrada e atualizada via `POST` e `PUT /api/v1/launches/:launchId/editorial-lines`, exige avatar, oferta e posicionamento vigentes, mantém pilares com prioridade e ativação por versão e preserva o histórico para consultas futuras.
- O plano de conteúdo do lançamento pode ser registrado e atualizado via `POST` e `PUT /api/v1/launches/:launchId/content-plans`, exige linha editorial vigente, mantém itens agrupáveis por etapa, período e objetivo e preserva histórico para evolução operacional posterior.
- O cronograma inteligente do lançamento pode ser gerado e ajustado via `POST` e `PUT /api/v1/launches/:launchId/smart-schedules`, exige plano de conteúdo vigente, retorna atividades com prazo em UTC, área, responsável sugerido e status, e preserva histórico dos ajustes.
- A aprovação do planejamento pelo expert pode ser submetida via `POST /api/v1/launches/:launchId/expert-approvals` e decidida via `POST /api/v1/launches/:launchId/expert-approvals/decision`, exige pacote estratégico completo com cronograma vigente, preserva histórico versionado, audita submissão e parecer, e permite reenvio após ajustes quando houver reprovação.
- A autorização da API é resolvida pelas permissões vinculadas ao cargo do usuário autenticado.
- Os endpoints protegidos exigem token JWT no header `Authorization: Bearer <token>`.
- O fluxo de autenticação usa `accessToken` para acesso aos endpoints protegidos e `refreshToken` para renovação e logout da sessão.
- O projeto `Mentoria 2.0 Desafios` não faz parte desta entrega e não foi alterado.

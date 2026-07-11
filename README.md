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
- A consulta individual de cargo via `GET /api/v1/roles/:id` retorna somente os campos públicos e os códigos de permissões associadas, quando existirem.
- A autorização da API é resolvida pelas permissões vinculadas ao cargo do usuário autenticado.
- Os endpoints protegidos exigem token JWT no header `Authorization: Bearer <token>`.
- O fluxo de autenticação usa `accessToken` para acesso aos endpoints protegidos e `refreshToken` para renovação e logout da sessão.
- O projeto `Mentoria 2.0 Desafios` não faz parte desta entrega e não foi alterado.

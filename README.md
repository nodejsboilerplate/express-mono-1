# Nebula - Personalized JavaScript Boilerplate

## Stack overview

- Language: TypeScript
- Runtime: Node.js
- Framework: Express
- Database: PostgreSQL
- ORM: Drizzle
- Cache/queue/session support: Redis
- Validation: Zod
- Auth: JWT + cookies + Google OAuth
- Email delivery: Resend
- SMS: Twilio
- Logging: Pino + request logger middleware
- Rate limiting: express-rate-limit + Redis-backed store
- Testing: Vitest + Supertest
- Dev tooling: Husky, Commitlint, Prettier, ESLint
- Containers: Docker + Docker Compose
- Monitoring: Prometheus + Grafana + Loki

## Project structure

```bash
.
├── .github/
├── .husky/
├── src/
│   ├── blueprints/
│   ├── config/
│   ├── constants/
│   ├── containers/
│   ├── controllers/
│   ├── database/
│   │   ├── repositories/
│   │   ├── relations/
│   │   ├── schemas/
│   │   └── seeds/
│   ├── events/
│   ├── libs/
│   ├── middlewares/
│   ├── redis/
│   ├── routes/
│   ├── services/
│   │   └── auth/
│   ├── tests/
│   ├── types/
│   ├── utils/
│   ├── validators/
│   ├── zod/
│   ├── container.ts
│   ├── index.ts
│   ├── server.ts
│   └── ...
├── emails/
├── oas/
├── terraform/
├── .env.example
├── docker-compose.yaml
├── Dockerfile
├── Dockerfile.dev
├── drizzle.config.ts
├── eslint.config.ts
├── package.json
├── pnpm-lock.yaml
├── prometheus.yaml
├── tsconfig.json
├── typedoc.json
├── vitest.config.js
└── README.md
```

## Dependency injection container

The project uses a central container setup to wire app dependencies together:

- `createContainer()`
- `createServices()`
- `createRepositories()`
- `createValidators()`
- `createMiddlewares()`
- `createControllers()`

This keeps the application modular and makes it easy to plug different implementations into the same architecture.

## Authentication and user features

The boilerplate already includes a powerful user/auth foundation:

- Manual signup and login
- Email verification
- Google OAuth login/signup
- JWT token generation and refresh flow
- Protected routes using auth middleware
- User profile management
- Address creation and updates
- Contact creation and updates
- Phone and email verification flows
- User deletion and profile retrieval

## Operational features

- Request logging with Pino
- Global error handling middleware
- Redis-backed rate limiting
- Docker Compose environment with Postgres, Redis, RedisInsight, Swagger, Prometheus, Grafana, and Loki
- Health check endpoint: `/health`
- Metrics endpoint: `/metrics`
- Husky + Commitlint for quality gates
- TypeDoc generation support

## Terraform (what it does and how to use it)

This repository includes a `terraform/` folder that automates Grafana setup (datasources, a dashboard folder and dashboards) for monitoring your application. It does not provision cloud infrastructure like Postgres or Redis — instead it configures Grafana to point at existing Prometheus and Loki endpoints so dashboards and log sources are created automatically.

What the Terraform code does:

- Creates a Grafana folder named `Nebula`
- Registers Prometheus and Loki data sources in Grafana
- Installs the `Nebula Server` dashboard(s) (JSON templates are shipped under the Terraform module)

Quick usage (point Terraform at a running Grafana instance):

1. Ensure Grafana, Prometheus and Loki are running (docker compose brings them up on the ports listed below).
2. From the `terraform/` folder run:

```bash
cd terraform
terraform init
terraform plan
terraform apply -auto-approve
```

Note: the Terraform provider used is the Grafana provider and the modules rely on JSON dashboard templates in the repo. Terraform creates the dashboard resources in the target Grafana instance.

## Monitoring - how to view metrics and logs

This boilerplate wires Prometheus and Grafana together so you get metrics and logs out-of-the-box when running the Docker stack.

Where to open the UIs (default Docker Compose ports):

- Grafana: http://localhost:3005 — dashboards created by Terraform live here (username/password default: `admin:admin` when using the included docker image)
- Prometheus: http://localhost:9090 — explore metrics, run ad-hoc queries
- Loki: http://localhost:3100
- RedisInsight: http://localhost:5540 — inspect Redis data

## Environment setup

Copy the example environment file and configure your secrets:

```bash
cp .env.example .env
```

Key values include:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_HOST` / `REDIS_PORT`
- `JWT_ACCESS_TOKEN_SECRET`
- `JWT_REFRESH_TOKEN_SECRET`
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_AUTH_REDIRECT_URI`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

## Getting started

### 1) Install dependencies

```bash
pnpm install
```

### 2) Create environment files

For local non-Docker development:

```bash
cp .env.example .env
```

For Docker-based local/production-like setup, create a Docker environment file:

```bash
cp .env.example .env.production.local
```

Important: the Docker Compose setup in this project reads `./.env.production.local` for the app service (`env_file: ./.env.production.local`).

### 3) Run the app in development mode

Local development server:

```bash
pnpm dev
```

This starts the app with `tsx --watch ./src/index.ts` and listens on the configured `PORT` value from `.env` (default: `3000`).

### 4) Run production build locally

Build the app first:

```bash
pnpm build
```

Then run the compiled server:

```bash
PORT=3000 node dist/index.mjs
```

Or with a `.env` file loaded automatically from your shell environment:

```bash
node dist/index.mjs
```

### 5) Run with Docker

Start the full stack (API + Postgres + Redis + RedisInsight + Prometheus + Grafana + Loki):

```bash
docker compose up --build
```

Run in detached mode:

```bash
docker compose up -d
```

Stop everything:

```bash
docker compose down
```

### 6) Database commands

Generate Drizzle schema artifacts:

```bash
pnpm db:generate
```

Apply migrations:

```bash
pnpm db:migrate
```

Push schema directly:

```bash
pnpm db:push
```

Seed data:

```bash
pnpm db:seed
```

### 7) Test and validation

```bash
pnpm test
pnpm check:types
pnpm check:lint
```

## Port map

This project exposes the following ports:

- App server: `http://localhost:3000`
  - Health check: `http://localhost:3000/health`
  - Metrics: `http://localhost:3000/metrics`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- RedisInsight: `http://localhost:5540`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3005`
- Loki: `http://localhost:3100`

## Quick start summary

If you want the shortest path to running the project immediately:

```bash
pnpm install
pnpm --filter emails run build:package
cp .env.example .env
pnpm dev
```

If you want the Docker stack immediately:

```bash
cp .env.example .env.production.local
docker compose up
```

## Best use cases

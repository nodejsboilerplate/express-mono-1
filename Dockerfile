FROM node:24-alpine AS base

# ******************************SETUP PNPM*********************************
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ******************************INSTALLATION**************************************
FROM base AS installer

RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install the dependencies (as they change less often)
COPY package.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install --frozen-lockfile

# ******************************BUILD THE APP*************************************
FROM base AS builder

WORKDIR /app

COPY --from=installer /app .
COPY . .
RUN pnpm --filter emails run build:package
RUN pnpm install
RUN pnpm build

# ******************************RUN THE APP***********************************
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 express

COPY --from=builder --chown=express:nodejs  /app/package*.json .
COPY --from=builder --chown=express:nodejs  /app/node_modules ./node_modules
COPY --from=builder --chown=express:nodejs  /app/emails/dist ./emails/dist
COPY --from=builder --chown=express:nodejs  /app/emails/node_modules ./emails/node_modules
COPY --from=builder --chown=express:nodejs  /app/emails/package*.json ./emails/
COPY --from=builder --chown=express:nodejs  /app/dist ./dist

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD [ "node", "dist/index.mjs" ]
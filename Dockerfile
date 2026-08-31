# Base node image
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/worker/package*.json ./apps/worker/
COPY apps/scheduler/package*.json ./apps/scheduler/
COPY apps/web/package*.json ./apps/web/
COPY packages/db/package*.json ./packages/db/
COPY packages/engine/package*.json ./packages/engine/
COPY packages/nodes/package*.json ./packages/nodes/
COPY packages/shared-types/package*.json ./packages/shared-types/
RUN npm install
COPY . .

# Stage for API service
FROM base AS api
ENV PORT=3001
EXPOSE 3001
CMD ["npx", "tsx", "apps/api/src/server.ts"]

# Stage for Worker service
FROM base AS worker
CMD ["npx", "tsx", "apps/worker/src/worker.ts"]

# Stage for Scheduler service
FROM base AS scheduler
CMD ["npx", "tsx", "apps/scheduler/src/scheduler.ts"]

# Stage for Web service
FROM base AS web
ENV BACKEND_URL=http://api:3001
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173", "apps/web"]

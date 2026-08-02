# Base node image
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Build stage for frontend static files
FROM base AS build
COPY . .
RUN npm run build

# Stage for Frontend service
FROM base AS frontend
COPY . .
COPY --from=build /app/dist ./dist
ENV BACKEND_URL=http://backend:3001
EXPOSE 5173
CMD ["npm", "run", "preview"]

# Stage for Backend service
FROM base AS backend
COPY . .
ENV PORT=3001
EXPOSE 3001
CMD ["npx", "tsx", "src/server/server.ts"]

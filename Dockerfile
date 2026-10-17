# syntax=docker/dockerfile:1
# GraphHacks cockpit — Vite build, then nginx serves dist/ and proxies /api/.
# Build context: repo root (see docker-compose.yml).

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

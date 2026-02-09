# project-d-ui: Frontend (Vue 3 + Ionic + Vite)
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Build-time env vars (optional — frontend auto-detects API URLs from window.location)
ARG VITE_GATEWAY_BASE_URL
ARG VITE_FILE_STORAGE_BASE_URL

RUN npm run build

# --- Runtime: nginx serves static files ---
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx content
RUN rm -rf ./*

COPY --from=build /app/dist .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

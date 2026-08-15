# Stage 1: Build React static assets via Vite/Node
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve static files menggunakan Nginx Alpine
FROM nginx:alpine

# Set Timezone
ENV TZ=Asia/Jakarta

# Copy hasil build Vite ke folder HTML Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy kustomisasi Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
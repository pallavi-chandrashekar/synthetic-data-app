# ── Build stage ──
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ──
FROM nginx:alpine

RUN adduser -D -u 1001 appuser \
    && chown -R appuser:appuser /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid && chown appuser:appuser /var/run/nginx.pid

COPY --from=build /app/dist /usr/share/nginx/html

RUN printf 'server {\n\
    listen 8080;\n\
\n\
    add_header X-Frame-Options "DENY" always;\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
    add_header X-XSS-Protection "1; mode=block" always;\n\
\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

USER appuser

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

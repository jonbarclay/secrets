FROM node:20-alpine as build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --ignore-scripts

ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}

COPY frontend .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5173
ENTRYPOINT ["/docker-entrypoint.sh"]

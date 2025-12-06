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
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]

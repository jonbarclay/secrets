FROM node:20-alpine
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --ignore-scripts

COPY frontend .
RUN npm run build

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

FROM node:20-alpine
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --ignore-scripts

COPY frontend .
RUN npm run build

COPY frontend/start.sh ./start.sh
RUN chmod +x ./start.sh

RUN addgroup -S app && adduser -S app -G app && \
    chown -R app:app /app

USER app

EXPOSE 5173
CMD ["./start.sh"]

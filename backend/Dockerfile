FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential && \
    pip install --no-cache-dir --upgrade pip && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/start.sh ./start.sh
RUN chmod +x ./start.sh

RUN addgroup --system app && adduser --system --ingroup app app && \
    chown -R app:app /app

USER app

EXPOSE 8443
CMD ["./start.sh"]

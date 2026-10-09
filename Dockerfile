ARG NODE_IMAGE=node:24.9.0-bookworm-slim
FROM ${NODE_IMAGE}
WORKDIR /app/bot
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
COPY bot/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY bot ./
COPY content /app/content
ENV CONTENT_ROOT=/app/content
ENV DATABASE_PATH=/app/data/veiled_city.sqlite
CMD ["npm","start"]

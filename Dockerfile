FROM node:24-bookworm-slim
WORKDIR /app/bot
COPY bot/package*.json ./
RUN npm install --omit=dev
COPY bot ./
COPY content /app/content
ENV CONTENT_ROOT=/app/content
ENV DATABASE_PATH=/app/data/veiled_city.sqlite
CMD ["npm","start"]

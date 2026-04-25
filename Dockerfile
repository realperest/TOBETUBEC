FROM node:20-bookworm-slim
WORKDIR /app
# yt-dlp: resmi betik /usr/bin/env python3 ister; pip ile ayni Pythona baglanan giris noktasi calisir.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    ffmpeg \
    python3 \
    python3-pip \
  && python3 -m pip install --no-cache-dir --break-system-packages "yt-dlp==2026.3.17" \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]

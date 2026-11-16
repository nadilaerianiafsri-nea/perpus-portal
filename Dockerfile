
# ==========================================
# PORTAL PERPUSTAKAAN - FRONTEND NEXT.JS
# ==========================================

# Tahap 1: Install dependencies
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --no-audit --no-fund


# Tahap 2: Build aplikasi Next.js
FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Site Key publik diperlukan saat build Next.js
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${NEXT_PUBLIC_RECAPTCHA_SITE_KEY}

COPY --from=deps /app/node_modules ./node_modules

COPY . .

# Pastikan Site Key tersedia sebelum build
RUN test -n "$NEXT_PUBLIC_RECAPTCHA_SITE_KEY"

RUN npm run build


# Tahap 3: Menjalankan aplikasi
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json ./

RUN npm ci --omit=dev --no-audit --no-fund

# Berikan kepemilikan folder Next.js ke user node
# agar image optimizer dapat menulis cache.
COPY --chown=node:node --from=builder /app/.next ./.next

COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]

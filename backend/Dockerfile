
# syntax=docker/dockerfile:1

# ==========================================
# PORTAL PERPUSTAKAAN - BACKEND NESTJS
# ==========================================

FROM node:22-bookworm-slim

# Direktori kerja backend
WORKDIR /app/backend

# Tambahkan jalur dependensi untuk modul shared
ENV NODE_PATH=/app/backend/node_modules

# Dependensi sistem untuk Prisma dan Node.js
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       openssl \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Salin konfigurasi dependensi backend
COPY package.json package-lock.json ./

# Install dependensi backend
RUN npm ci --no-audit --no-fund

# Salin kode backend
COPY . .

# Salin modul shared dari additional build context
COPY --from=shared / /app/shared/

# Periksa apakah modul shared dapat memuat dependensinya
RUN node -e "require('/app/shared/inputValidation.cjs'); console.log('Shared dependencies OK')"

# Generate Prisma Client
RUN npx prisma generate

# Build aplikasi NestJS
RUN npm run build

# Siapkan folder penyimpanan file
RUN mkdir -p storage/covers \
    storage/ebooks \
    storage/avatars \
    && chown -R node:node storage

# Jalankan aplikasi dengan user non-root
USER node

# Port backend
EXPOSE 3001

# Jalankan NestJS
CMD ["npm", "run", "start:prod"]

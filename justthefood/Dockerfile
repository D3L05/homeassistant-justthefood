# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /build

# Copy package files
COPY app/package*.json ./

# Install dependencies
RUN npm ci

# Copy application source
COPY app/ ./

# Build Next.js in standalone mode
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies and build tools for native modules
RUN apk add --no-cache jq curl python3 make g++

# Copy standalone output first
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public

# Rebuild better-sqlite3 for musl libc (Alpine) - this overwrites the glibc version from standalone
COPY --from=builder /build/package*.json ./
RUN npm ci --omit=dev && \
    apk del python3 make g++

# Copy startup script
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Create data directory
RUN mkdir -p /data

EXPOSE 3000

CMD ["/run.sh"]

# Production Dockerfile for BitAtlas Backend
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate production secrets if needed
RUN if [ ! -f ".env" ]; then \
      echo "NODE_ENV=production" > .env && \
      echo "JWT_SECRET=REPLACE_ME_IN_PRODUCTION" >> .env; \
    fi

# Build for production (excludes index-simple.ts)
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bitatlasuser

# Copy production dependencies
COPY --from=deps --chown=bitatlasuser:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=bitatlasuser:nodejs /app/dist ./dist
COPY --from=builder --chown=bitatlasuser:nodejs /app/package.json ./package.json

# Switch to non-root user
USER bitatlasuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000

# Start production server
CMD ["npm", "run", "start:prod"]
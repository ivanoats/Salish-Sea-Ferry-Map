# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy scripts (needed for postinstall hook)
COPY scripts ./scripts

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:24-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json ./

# Copy scripts (needed for postinstall hook)
COPY scripts ./scripts

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built app from builder stage. Owned by `node` so the runtime user can
# write Next.js's on-disk caches under .next/ rather than failing on them.
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public

# Expose port
EXPOSE 3000

# Drop root. node:24-alpine ships this unprivileged user at uid 1000.
USER node

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

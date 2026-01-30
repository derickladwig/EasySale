# Multi-stage build for production frontend

# Stage 1: Build
FROM node:20-alpine AS builder

# Build arguments for version info
ARG VITE_APP_VERSION="0.1.0"
ARG VITE_BUILD_HASH="prod"
ARG VITE_BUILD_DATE=""
ARG VITE_RUNTIME_PROFILE="prod"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
# Use legacy-peer-deps for Vite/Storybook compatibility
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Set build-time environment variables for Vite
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_BUILD_HASH=${VITE_BUILD_HASH}
ENV VITE_BUILD_DATE=${VITE_BUILD_DATE}
ENV VITE_RUNTIME_PROFILE=${VITE_RUNTIME_PROFILE}

# Build application with production profile
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

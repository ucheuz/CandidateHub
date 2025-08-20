# Build stage
FROM --platform=linux/amd64 node:18-alpine AS build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --silent

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Production stage with nginx
FROM --platform=linux/amd64 nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set environment variables
ENV PORT=80
ENV NODE_ENV=production

EXPOSE 80

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Use entrypoint script to handle environment variable substitution
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

# Use Node.js 20 as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY task/ ./task/

# Expose any necessary ports (if needed)
# EXPOSE 3000

# Default command to run the handler
CMD ["node", "task/index.js"] 
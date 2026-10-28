FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install all dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and configuration
COPY src ./src
COPY tsconfig.json ./
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN npm run build

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]

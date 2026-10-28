FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install all dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy prisma schema & generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and configuration
COPY src ./src
COPY tsconfig.json ./

# Initial build
RUN npm run build

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run dev"]

FROM node:20

WORKDIR /app

# Install all dependencies (including dev)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and config
COPY src ./src
COPY tsconfig.json ./
COPY prisma ./prisma

# Build the app
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000
CMD ["node", "dist/index.js"]

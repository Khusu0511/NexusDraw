FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy server source
COPY server.js ./
COPY src/ ./src/

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server.js"]

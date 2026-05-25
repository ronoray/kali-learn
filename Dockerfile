FROM node:20-alpine AS builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
EXPOSE 4500

CMD ["node", "index.js"]

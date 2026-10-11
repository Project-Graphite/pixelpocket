FROM node:25-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

USER node
EXPOSE 5000

# Runs node directly: nodemon is a dev-only dependency.
CMD ["node", "server.js"]

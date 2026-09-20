# Single image serving the React build, the REST API and the WebSocket signaling server
# from one origin. Built for Lightsail Container Service, which terminates TLS for us on
# a *.cs.amazonlightsail.com hostname - so no custom domain or certificate is needed.

# ---- Stage 1: frontend ----
FROM node:20-alpine AS frontend
WORKDIR /fe
ENV CI=false
COPY package.json package-lock.json ./
# --omit=dev skips sharp, which is only used by an offline image script and has no
# prebuilt musl binary; react-scripts itself is a runtime dependency.
RUN npm ci --omit=dev
COPY public ./public
COPY src ./src
RUN npm run build

# ---- Stage 2: backend compile ----
FROM node:20-alpine AS backend
WORKDIR /be
COPY server/package.json server/package-lock.json server/tsconfig.json ./
RUN npm ci
COPY server/src ./src
RUN npm run build

# ---- Stage 3: runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=backend /be/dist ./dist
COPY --from=frontend /fe/build ./public

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# GitHub metadata update: no functional change.
CMD ["node", "dist/index.js"]

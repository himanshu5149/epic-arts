FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data CACHE_DIR=/data/cache DEMO_CHECKOUT=false
WORKDIR /app
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/shared ./shared
COPY --from=builder --chown=node:node /app/skills ./skills
COPY --from=builder --chown=node:node /app/vendor/awesome-llm-apps/LICENSE ./licenses/awesome-llm-apps-LICENSE
COPY --from=builder --chown=node:node /app/THIRD-PARTY-NOTICES.md ./THIRD-PARTY-NOTICES.md
COPY --from=builder --chown=node:node /app/private ./private
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]

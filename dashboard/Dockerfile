FROM node:20-alpine AS builder

ARG NEXT_PUBLIC_ADMIN_KEY=admin_key_change_in_prod
ARG NEXT_PUBLIC_GATEWAY_URL=http://localhost:3001
ENV NEXT_PUBLIC_ADMIN_KEY=$NEXT_PUBLIC_ADMIN_KEY
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image — only copy the built output
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/.next        ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public       ./public

EXPOSE 3000
CMD ["npm", "start"]
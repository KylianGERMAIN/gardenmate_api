FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

ENV NODE_ENV=development
ENV PORT=3000

CMD ["sh", "-c", "pnpm install && pnpm run start:dev"]

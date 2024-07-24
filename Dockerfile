from node:22.2.0

WORKDIR /APP
COPY . .

RUN npm install \
      && npm install @nestjs/common \
      && npm install @nestjs/core \
      && npx prisma generate --schema=./src/prisma/schema.prisma \
      && npm run build

ENTRYPOINT ["node", "dist/main"]

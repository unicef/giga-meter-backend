from node:22.2.0

WORKDIR /APP
COPY . .
RUN npm install \
      && npm install @nestjs/common \
      && npm install @nestjs/core \
      && npx prisma generate --schema=./src/prisma/schema.prisma \
      && npm run build

# Remove everything except dist
#RUN mkdir /temp \
#      && mv * /temp \
#      && mv /temp/dist . \
#      && rm -rf /temp

ENTRYPOINT ["node", "dist/main"]

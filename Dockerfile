from node:22.2.0

WORKDIR /APP
COPY . .
RUN npm install \
      && npx prisma generate --schema=./src/prisma/schema.prisma \
      && npm run build

# Remove everything except dist
RUN mkdir /temp
RUN mv * /temp
RUN mv /temp/dist .
RUN rm -rf /temp

ENTRYPOINT ["node", "dist/main"]

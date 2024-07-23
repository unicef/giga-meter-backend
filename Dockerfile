from node:22.2.0

WORKDIR /APP
COPY . .
RUN npm install \
      && npx prisma generate --schema=./src/prisma/schema.prisma \
      && npm run build

# Remove everything except dist
RUN mkdir tmp
RUN mv * tmp
RUN mv tmp/dist .
RUN rm -rf tmp

ENTRYPOINT ["node", "dist/main"]

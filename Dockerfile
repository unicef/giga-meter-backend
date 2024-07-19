from node:22.2.0

WORKDIR /APP
COPY . .
RUN npm install
RUN npm run build

# Remove everything except dist
RUN mkdir tmp \
      && mv * tmp \
      && mv tmp/dist . \
      && rm -rf tmp

ENTRYPOINT ["node", "dist/main"]

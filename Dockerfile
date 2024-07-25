from node:22.2.0

WORKDIR /APP
COPY . .

RUN npm install \
      && npx prisma generate --schema=./src/prisma/schema.prisma \
      && npm run build

# ssh
ENV SSH_PASSWD "root:Docker!"
RUN apt-get update \
        && apt-get install -y --no-install-recommends dialog \
        && apt-get update \
	&& apt-get install -y --no-install-recommends openssh-server \
	&& echo "$SSH_PASSWD" | chpasswd

COPY sshd_config /etc/ssh/

ENTRYPOINT ["node", "dist/main"]

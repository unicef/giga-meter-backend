from node:22.2.0

WORKDIR /APP
COPY . .

RUN npm install \
      && npx prisma generate --schema=./src/prisma/schema.prisma \
      && npm run build

# ssh
ARG SSH_PASSWD
ENV SSH_PASSWD $SSH_PASSWD
RUN apt-get update \
      && apt-get install -y --no-install-recommends dialog \
      && apt-get update \
      && apt-get install -y --no-install-recommends openssh-server \
      && echo "$SSH_PASSWD" | chpasswd

COPY sshd_config /etc/ssh/

EXPOSE 2222

ENTRYPOINT ["/bin/bash", "./start.sh"]

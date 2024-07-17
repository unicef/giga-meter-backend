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

# SSH
ENV SSH_PASSWD "root:Docker!"
RUN apt-get update \
        && apt-get install -y --no-install-recommends dialog \
        && apt-get update \
	&& apt-get install -y --no-install-recommends openssh-server \
	&& echo "$SSH_PASSWD" | chpasswd
COPY sshd_config /etc/ssh/

ENTRYPOINT ["node", "dist/main"]

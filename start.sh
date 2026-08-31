#!/usr/bin/env bash
set -ex

# export environment variables to make them available in ssh session
for var in $(compgen -e); do
    echo "export $var=${!var}" >> /etc/profile
done

eval $(printenv | awk -F= '{print "export " "\""$1"\"""=""\""$2"\"" }' >> /etc/profile)

echo "Starting SSH ..."
service ssh start

npx prisma migrate deploy --schema=./src/prisma/schema.prisma
node dist/main
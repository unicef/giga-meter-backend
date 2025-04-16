echo "Starting SSH ..."
service ssh start

npx prisma migrate deploy --schema=./src/prisma/schema.prisma
node dist/main

FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV DATABASE_URL="postgresql://user_name:placeholder@postgres_db:5432/ats_db"

RUN npx prisma generate

# Apply pending migrations, then start the service (replace with the real start command once the API exists).
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && tail -f /dev/null"]

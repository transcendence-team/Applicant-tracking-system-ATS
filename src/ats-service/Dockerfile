FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/src/postgres/ats-db
COPY src/postgres/ats-db/package*.json ./
RUN npm ci
COPY src/postgres/ats-db/ ./
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate
WORKDIR /app/src/ats-service
COPY src/ats-service/package*.json ./
RUN npm ci
COPY src/ats-service/src ./src
COPY src/ats-service/test ./test
RUN mkdir -p /data/resumes && chown node:node /data/resumes
USER node
EXPOSE 3000
CMD ["npm", "start"]

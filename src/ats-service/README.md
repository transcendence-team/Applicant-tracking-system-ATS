# ats-service – database (Prisma)

Owns **`ats_db`** only. Users/roles/permissions belong to the Spring Boot
auth-service (`auth_db`); here every `user_id` column is the user's UUID (JWT `sub`)
with no foreign key, because Postgres can't FK across databases.

## First-time setup
```bash
cd src/ats-service
cp ../.env.example ../.env          # then fill in real values
npm install
# when running Prisma from your host, point DATABASE_URL at localhost, e.g.
# DATABASE_URL=postgresql://user_name:your_password@localhost:5432/ats_db
npx prisma migrate dev --name init  # creates prisma/migrations/ + applies it
npx prisma db seed                  # application statuses + starter skills
```
Commit the generated `prisma/migrations/` folder.

## Daily workflow
- Edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <what_changed>`.
- Use the client via `import { prisma } from "./prisma.js"`.
- `npx prisma studio` for a quick GUI.

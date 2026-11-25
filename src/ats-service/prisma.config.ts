import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const prismaDir = process.env.ATS_SCHEMA_PATH
  ? "/ats-schema"
  : "../postgres/ats-db/prisma";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: `${prismaDir}/migrations`,
    seed: `tsx ${prismaDir}/seed.ts`,
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
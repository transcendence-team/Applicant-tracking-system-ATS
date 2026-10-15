import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Kanban columns, in board order.
const STATUSES = [
  { name: "Applied", position: 1, isTerminal: false },
  { name: "Screening", position: 2, isTerminal: false },
  { name: "Interview", position: 3, isTerminal: false },
  { name: "Offer", position: 4, isTerminal: false },
  { name: "Hired", position: 5, isTerminal: true },
  { name: "Rejected", position: 6, isTerminal: true },
  { name: "Withdrawn", position: 7, isTerminal: true },
];

const SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "Node.js", "React",
  "Next.js", "Spring Boot", "PostgreSQL", "Docker", "Git", "SQL",
];

async function main() {
  for (const s of STATUSES) {
    await prisma.applicationStatus.upsert({
      where: { name: s.name },
      update: { position: s.position, isTerminal: s.isTerminal },
      create: s,
    });
  }
  for (const name of SKILLS) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Seeded ${STATUSES.length} statuses and ${SKILLS.length} skills.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/*Create migration for the schema:
    docker compose run --rm ats-api npx prisma migrate dev --name init 
  
  Shows database tables:
    docker compose exec postgres_db \
  psql -U user -d ats_db -c '\dt'

*/
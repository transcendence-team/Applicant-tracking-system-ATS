# ATS Database

```
ats/
├── docker-compose.yml        # PostgreSQL container (backend_net)
├── .env.example              # DB_PASSWORD for docker compose
└── db/
    ├── .env.example          # DATABASE_URL for Prisma
    ├── package.json / tsconfig.json
    ├── prisma/
    │   ├── schema.prisma     # source of truth for the schema
    │   ├── extras.sql        # CHECK constraints (appended to the init migration)
    │   ├── seed.ts           # roles, statuses, test users, sample job
    │   └── migrations/       # generated - COMMIT this folder to Git
    └── src/
        ├── index.ts          # shared Prisma client
        ├── kanban.ts         # moveApplication() with optimistic locking
        ├── audit.ts          # logAudit() / logActivity()
        └── demo.ts           # proves the concurrency protection works
```

Rule: nobody edits tables by hand. Every schema change = edit schema.prisma + `npx prisma migrate dev --name what_changed`.

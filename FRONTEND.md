# Frontend

The ATS frontend lives in `src/frontend`. It is built with Next.js (App Router), React, TypeScript and Tailwind CSS.

## Requirements

- Docker (with the Compose plugin)
- Node.js 20

## Run it

### Shortcut (from the project root)

```bash
make frontend
```

This copies the example env files if they are missing, starts the backend containers, installs the frontend dependencies and starts the dev server.

### Or Manual steps

```bash
cp .env.example .env                                   # root, only once
cp src/frontend/.env.example src/frontend/.env.local   # only once
docker compose up -d --build                           # backend: NGINX, auth service, databases
cd src/frontend
npm install
npm run dev
```

If if everything is perfect, open http://localhost:3000 in your browser.

To stop: `Ctrl+C` stops the frontend only. Stop the containers with `docker compose down`.


## Test account

There is no register page yet. Create a test user through the API:

```bash
curl -k -i -X POST https://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "ayoub@gmail.com", "password": "pass123"}'
```

## How login works

1. The login page (`/login`) sends the email and password to our own route, `/api/session/login`.
2. That route (`src/frontend/app/api/session/login/route.ts`) asks the auth service to log the user in.
3. On success, the JWT is stored in an HTTP-only cookie named `token` (2 hours, like the token). The browser's JavaScript never sees the token.
4. The user is redirected for now to `/login`.

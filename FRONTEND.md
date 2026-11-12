# Frontend

The ATS frontend lives in `src/frontend`. It is built with Next.js (App Router), React, TypeScript and Tailwind CSS.

## Requirements

- Docker (with the Compose plugin)

## Run it

From the project root:

```bash
make up
```

Or manually:

```bash
cp .env.example .env
docker compose up -d --build
```

Open https://localhost in your browser.

To stop the containers: `make down` (or `docker compose down`).


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

# CourtControl Basketball Webapp

A Next.js and TypeScript starter for a basketball team application. The project includes a clear App Router structure, reusable UI components, authentication helpers, a small JSON-backed data access layer, and role-based access control.

## Structure

- `src/app` contains public and private routes.
- `src/components` contains shared UI components.
- `src/lib/auth` contains password hashing, signed session tokens, cookie handling, and auth actions.
- `src/lib/db` contains the user model and JSON-backed data access helpers.
- `src/lib/rbac` contains roles and permission checks.

## Authentication and authorization

Users have `id`, `email`, `passwordHash`, `role`, `emailVerifiedAt`, `createdAt`, and `updatedAt` fields. Supported roles are `admin` and `user`.

Private routes are protected server-side in two layers:

1. `src/middleware.ts` redirects unauthenticated requests before protected pages render.
2. Protected pages call `requireUserSession` or `requireAdminSession` before loading private data.

For demo purposes, registering with an `@basketball.local` email creates an admin user. Other emails create regular users.

## Development

```bash
npm install
npm run dev
```

Set `AUTH_SECRET` in production to a strong random value so signed session cookies cannot be forged.

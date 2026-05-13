# CourtControl Basketball Webapp

A Next.js and TypeScript starter for a basketball team application. The project includes a clear App Router structure, reusable UI components, authentication helpers, a small JSON-backed data access layer, and role-based access control.

## Structure

- `src/app` contains public and private routes.
- `src/components` contains shared UI components.
- `src/lib/auth` contains password hashing, signed session tokens, cookie handling, and auth actions.
- `src/lib/db` contains the user model and JSON-backed data access helpers.
- `src/lib/rbac` contains roles and permission checks.
- `src/lib/training-plans.ts` contains JSON-backed metadata and file storage helpers for training plans.

## Authentication and authorization

Users have `id`, `email`, `passwordHash`, `role`, `emailVerifiedAt`, `createdAt`, and `updatedAt` fields. Supported roles are `admin` and `user`.

Private routes are protected server-side in two layers:

1. `src/middleware.ts` redirects unauthenticated requests before protected pages render.
2. Protected pages call `requireUserSession` or `requireAdminSession` before loading private data.

Session handling validates the signed session cookie against the local user database on every server-side access. Deleted or blocked users lose access even if they still have an old cookie.

For demo purposes, registering with an `@basketball.local` email creates an admin user. Other emails create regular users.

Admins can open `/admin` to see existing users, block or unblock accounts, and set a new password for a user.

## Training plans

Authenticated users can open `/training-plans` and upload PDF, DOC, and DOCX files up to 25 MB. Training plans are assigned to one of these categories: U10, U12, U14, U16, U19, or Damen. Users can delete their own uploaded plans; admins can delete every plan.

Uploaded files and metadata are stored locally under `.data`, which is ignored by Git:

- `.data/training-plans.json` stores metadata.
- `.data/training-plans/` stores the uploaded files.

PDF files can be previewed directly in the app. Word files are served through the protected file route and opened or downloaded by the browser.

## Development

On this Windows/PowerShell setup, use `npm.cmd` instead of `npm` because PowerShell may block the `npm.ps1` shim.

Install dependencies:

```bash
npm.cmd install
```

Start the development server:

```bash
npm.cmd run dev
```

Then open:

```text
http://localhost:3000
```

The local `dev`, `build`, and `start` scripts first stop competing Next.js processes for this project. This keeps `.next` consistent and prevents stale HTML from pointing to missing CSS files.

Useful checks:

```bash
npm.cmd run typecheck
npm.cmd run build
```

Set `AUTH_SECRET` in production to a strong random value so signed session cookies cannot be forged.

# Wyndell's

Full-stack restaurant monorepo — **Supabase** (PostgreSQL), **E**xpress, **R**eact, **N**ode.
Built with npm workspaces: the client and server are separate workspaces installed from the root.

## Stack

| Layer    | Tech                                            |
| -------- | ----------------------------------------------- |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4     |
| Backend  | Node.js, Express, TypeScript (run with tsx)     |
| Database | Supabase (PostgreSQL) via @supabase/supabase-js |

## Project layout

```
wyndells/
├── package.json        # root: scripts to run everything + lint tooling
├── .env.example        # copy to .env and configure
├── supabase/
│   └── migrations/     # SQL migrations (schema, indexes, RLS, report functions)
├── client/             # React frontend (Vite workspace)
│   ├── src/            # components, pages, styles
│   ├── public/         # static assets
│   ├── index.html
│   ├── vite.config.ts  # dev proxy: /api -> http://localhost:5000
│   └── package.json
└── server/             # Express API (workspace)
    ├── index.ts        # app entry
    ├── config/db.ts    # Supabase client (PostgREST)
    ├── models/         # row types + API serializers
    ├── services/       # queries against Supabase
    ├── routes/         # Express route handlers
    └── package.json
```

## Getting started

1. Install dependencies (once, from the root — npm workspaces install both packages):

   ```bash
   npm install
   ```

2. Create a Supabase project (https://supabase.com/dashboard) and run the schema
   migration. Either use the Supabase CLI:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   or open **SQL Editor → New query**, paste the contents of
   `supabase/migrations/0001_initial_schema.sql`, and run it. This creates the
   tables, indexes, row-level security, and the report functions the dashboard
   depends on.

3. Configure environment variables:

   ```bash
   copy .env.example .env
   ```

   Edit `.env` and set `SUPABASE_URL` (e.g. `https://abcxyz.supabase.co`) and
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API). The service-role key
   bypasses Row Level Security so all authorization stays in the Express API —
   never put it in client code. If Supabase is not reachable, the API still
   starts so you can keep working on the frontend.

4. Seed the database (optional but recommended for development):

   ```bash
   npm run seed --workspace server
   ```

   Creates the branches, an admin + one manager per branch, dining tables, menu
   items, and sample reservations/feedback.

5. Run both dev servers from the project root:

   ```bash
   npm run dev
   ```

   - Frontend (client): http://localhost:5173
   - API (server):       http://localhost:5000/api/health

The Vite dev server proxies `/api/*` requests to the Express server, so the
client calls the backend with relative URLs (e.g. `fetch('/api/health')`).

## Scripts (root)

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Run the client (Vite) and server (API) together  |
| `npm run dev:client` | Run only the client                              |
| `npm run dev:server` | Run only the server (`tsx watch`)                |
| `npm run build`      | Build the client for production                  |
| `npm run preview`    | Preview the production client build              |
| `npm run lint`       | Lint the client and server                       |
| `npm run typecheck`  | Type-check the client and server                 |

You can also run commands inside a single workspace, e.g. `npm run typecheck -w server` or `npm run dev -w client`.

## API surface

The Express server exposes the same routes the client uses today:

| Method | Path                          | Access              |
| ------ | ----------------------------- | ------------------- |
| GET    | `/api/health`                 | Public              |
| POST   | `/api/auth/login`             | Public              |
| GET    | `/api/auth/me`                | Staff               |
| GET    | `/api/branches` `/api/branches/:codeOrId` | Public  |
| GET    | `/api/menu` `/api/menu/:id`   | Public (QR menu)    |
| POST   | `/api/reservations` `/api/reservations/slots` `/api/reservations/verify` | Public |
| GET    | `/api/feedback` `/api/feedback/manage` | Public / Staff |
| GET    | `/api/tables` `/api/reservations` `/api/reports/overview` | Staff |
| POST/PUT/PATCH/DELETE | users, branches, menu, tables, reservations, feedback | Admin / Manager |

The response shapes are kept identical to the previous MongoDB version (ids are
serialized as `_id`, fields stay camelCase), so the React client did not need
any changes for this migration.

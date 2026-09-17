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
   migrations. Either use the Supabase CLI:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   or open **SQL Editor → New query**, paste the contents of
   `supabase/migrations/0001_initial_schema.sql`, then
   `supabase/migrations/0002_careers.sql`, then
   `supabase/migrations/0003_user_profiles.sql`, and run each. This creates the
   tables, indexes, row-level security, and the report functions the dashboard
   depends on, plus the `career_postings` / `job_applications` tables powering
   the Careers feature and the staff profile columns (job title, contact number,
   address, avatar and bio) used by **Users & Managers**.

   > Profile photos are uploaded to a public Supabase Storage bucket (`avatars`)
   > that the API creates automatically on the first upload, so no extra SQL is
   > required for the photo upload itself.

   > The API reads the profile columns on every staff login, so an existing
   > project must run `0003_user_profiles.sql` before deploying this code —
   > otherwise sign-in fails with `Invalid email or password.`.

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
| PATCH  | `/api/auth/me`                | Staff (own profile: `name`, `position`, `contactNumber`, `address`, `avatarUrl`, `bio`; see *Staff profile photos*) |
| GET    | `/api/branches` `/api/branches/:codeOrId` | Public  |
| GET    | `/api/menu` `/api/menu/:id`   | Public (QR menu)    |
| POST   | `/api/reservations` `/api/reservations/slots` `/api/reservations/verify` | Public |
| GET    | `/api/feedback` `/api/feedback/manage` | Public / Staff |
| GET    | `/api/careers/postings` | Public (open positions) |
| POST   | `/api/careers/applications` | Public (job applications; `multipart/form-data` with a `resume` PDF/DOC/DOCX file, up to 5 MB) |
| GET/POST/PUT/DELETE | `/api/careers/postings` `/api/careers/postings/manage` `/api/careers/postings/:id` | Staff (positions) |
| GET   | `/api/careers/applications` | Staff (applications inbox) |
| PATCH  | `/api/careers/applications/:id/status` | Staff (pipeline updates) |
| DELETE | `/api/careers/applications/:id` | Admin |
| GET    | `/api/tables` `/api/reservations` `/api/reports/overview` | Staff |
| POST/PUT/PATCH/DELETE | users, branches, menu, tables, reservations, feedback | Admin / Manager |

### Staff profile photos

Profile photos live in a public Supabase Storage bucket (`avatars`) that the API
creates on the first upload — no SQL migration is needed for it.

- `PATCH /api/auth/me` (own profile) and `POST`/`PUT /api/users` (admin) accept
  the profile fields as JSON **or** as `multipart/form-data`.
- Send the photo as the `avatar` file field (JPG, PNG, or WEBP, up to 2 MB). The
  uploaded file's public URL is stored in `avatarUrl`.
- Send `avatarUrl` as an empty string to remove a photo: the column is cleared
  and the file is deleted from storage.
- Replacing or removing a photo deletes the file it replaced, and deleting a
  staff account cleans up its photo, so no orphan files are left behind.
- In the dashboard the photo is managed with **Upload photo** / **Change photo**
  / **Remove** in the staff form — **Users & Managers → Edit details** for
  admins, or **My profile** from the sidebar for your own account.

```bash
# Upload a photo for your own account (staff).
curl -X PATCH http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token>" \
  -F "name=Wyndell's Administrator" -F "position=Owner" -F "avatar=@photo.jpg"

# Remove it again.
curl -X PATCH http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token>" -F "avatarUrl="
```

The response shapes are kept identical to the previous MongoDB version (ids are
serialized as `_id`, fields stay camelCase), so the React client did not need
any changes for this migration.

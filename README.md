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

The full annotated tree lives in [STRUCTURE.md](./STRUCTURE.md). Summary:

```
wyndells/
├── package.json          # root: scripts to run everything + lint tooling
├── .env.example          # copy to .env and configure
├── supabase/migrations/  # SQL migrations (schema, indexes, RLS, report functions)
├── client/               # React frontend (Vite workspace)
│   ├── src/app/          # App.tsx — routes only
│   ├── src/pages/        # route-level pages (public/ and dashboard/)
│   ├── src/features/     # domain folders with their own components/
│   ├── src/components/   # ui/ (shadcn), common/, layout/, auth/
│   ├── src/services/api/ # typed fetch client + one module per domain
│   ├── src/contexts/     # AuthContext
│   ├── src/types|utils|hooks|styles|assets
│   ├── public/           # static assets served as-is
│   ├── index.html
│   ├── vite.config.ts    # dev proxy: /api -> http://localhost:5000
│   └── package.json
└── server/               # Express API (workspace)
    └── src/
        ├── server.ts     # app entry
        ├── config/       # Supabase client (PostgREST)
        ├── models/       # row types + API serializers
        ├── services/     # queries against Supabase
        ├── controllers/  # thin HTTP adapters
        ├── routes/       # Express route handlers
        ├── middleware/   # auth, uploads, error handler
        ├── constants/    # enums, limits, status transitions
        ├── utils/        # ApiError, validation helpers
        └── db/           # seed.ts + data/branches.json
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
   `supabase/migrations/0003_user_profiles.sql`, then
   `supabase/migrations/0004_notifications_activity.sql`, then
   `supabase/migrations/0005_chat.sql`, and run each. This
   creates the tables, indexes, row-level security, and the report functions the
   dashboard depends on, plus the `career_postings` / `job_applications` tables
   powering the Careers feature, the staff profile columns (job title, contact
   number, address, avatar and bio) used by **Users & Managers**, the
   `notifications` / `activity_log` tables behind the header bell and the
   admin **Activity** page, and the `chat_conversations` / `chat_participants` /
   `chat_messages` tables behind the staff **Chat** page.

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

   Creates the seven Wyndell&rsquo;s branches (&ldquo;Wyndell&rsquo;s Al Fresco&rdquo;, &ldquo;at The
   Perch Highland Park&rdquo;, &ldquo;Town&rdquo;, &ldquo;Masinag&rdquo;, &ldquo;Arca South&rdquo;,
   &ldquo;Bed and Breakfast&rdquo; and &ldquo;Farm&rdquo;), an admin + one manager per branch,
   dining tables, menu items, and sample reservations/feedback.

   Branch names live in `BRANCH_DATA` (`server/src/db/seed.ts`); the seed matches on the
   branch `code`, so re-running it never duplicates an existing branch. Any active
   branch whose code is no longer in `BRANCH_DATA` (for example a location seeded
   under an older name) is listed at the end of the seed output — rename or
   deactivate it from **Dashboard → Branches** so the public site shows only
   current branches. Add new branches there too, or straight from the dashboard.

   To set up the branches with their manager accounts, floor plan and menu only
   (no sample reservations, reviews or job postings — handy for a live project):

   ```bash
   npm run seed:branches --workspace server
   ```

   Every branch also gets a floor plan and a menu. Branches that are still empty
   copy the tables and menu items of the content-source branch (`CONTENT_SOURCE_CODE`
   in `server/src/db/seed.ts`, currently `masinag`), so a new location starts from the same
   floor plan and menu; if that branch has none either, the built-in
   `TABLE_TEMPLATE` / `MENU_TEMPLATE` is used. Branches that already have tables or
   menu items are never touched — re-running the seed is always safe. Edit the real
   floor plans and dishes per branch in **Dashboard → Tables / Menu**.

   To make the database match `BRANCH_DATA` exactly — refresh every listed branch
   (name, address, city, contact number, email, hours, description) and deactivate
   any other branch that is still active:

   ```bash
   npm run seed:sync --workspace server
   ```

   > `seed:sync` overwrites these fields for the listed branches, so dashboard
   > edits to them are lost. Only the branch details are touched — staff profiles,
   > tables, menus, reservations and feedback are left alone.

   After changing the branch list, also refresh the public static copy that lists
   locations by name (`client/src/components/common/Footer.tsx`) and the counts in
   the hero copy (`HomePage.tsx`, `BranchesPage.tsx`).

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
| GET    | `/api/notifications` `/api/notifications/unread-count` | Staff (own inbox) |
| PATCH  | `/api/notifications/:id/read` `/api/notifications/:id/unread` | Staff (own inbox) |
| POST   | `/api/notifications/read-all` | Staff |
| GET    | `/api/activity` | Admin (audit trail; `group`, `actor`, `branch`, `page`) |
| GET/POST | `/api/chat/conversations` | Staff (list conversations; create a `direct` or `group` conversation) |
| GET    | `/api/chat/conversations/:id/messages` | Staff (member of that conversation; `before`, `limit` paging) |
| PATCH  | `/api/chat/conversations/:id` | Staff members (rename a group: `title`) |
| POST/DELETE | `/api/chat/conversations/:id/participants` `/api/chat/conversations/:id/participants/:userId` | Staff (add members; remove a member — owner/admin — or leave with `me`) |
| POST   | `/api/chat/conversations/:id/read` | Staff (member) |
| GET    | `/api/chat/unread-count` `/api/chat/directory` | Staff (own unread totals; staff directory for the pickers) |
| POST   | `/api/chat/uploads` | Staff (`multipart/form-data` with a `file`, images/documents up to 10 MB) |
| WS     | `/socket.io` | Staff (JWT handshake; send/edit/delete messages, typing, read receipts) |
| POST/PUT/PATCH/DELETE | users, branches, menu, tables, reservations, feedback | Admin / Manager |

### Notifications & activity log

- **Notifications** — the bell in the dashboard header polls
  `GET /api/notifications/unread-count` every 30 seconds while the tab is
  visible. Branch events (a new online reservation, a status change, an
  assigned table, new feedback, a job application) fan out to the active staff
  of that branch **plus** every administrator; account events go to the
  account itself.
- **Guaranteed first item** — an account with no notifications is given a
  welcome one on its first inbox read, and `npm run seed --workspace server`
  backfills every seeded account, so the bell is never empty.
- **Activity log** — `activity_log` records who changed what (reservations,
  feedback, careers, staff accounts, branches, tables and menu items) and is
  read from the admin-only **Activity** page at `/staff/activity`. Log writes
  are best-effort: a failed insert is logged and never fails the operation
  that produced it.

Requires `supabase/migrations/0004_notifications_activity.sql`.

### Staff chat

Every account that can sign in to the staff portal (administrators **and**
managers) gets a **Chat** page at `/staff/chat` — no role gate, no branch
filtering: anyone can message anyone, one-to-one or in groups.

- **Transport** — history and membership are plain REST (`/api/chat/...`);
  live traffic runs over Socket.io on the same server (`/socket.io`,
  proxied by Vite in development). The WebSocket handshake carries the same
  JWT as the REST API and re-reads the user row, so deactivated accounts are
  refused immediately.
- **Events** — clients emit `message:send` / `message:edit` / `message:delete`
  (all acknowledged), `typing`, and `read:mark`; the server broadcasts
  `message:new|updated|deleted`, `conversation:created|updated|removed`,
  `participant:added|removed`, `read:updated`, and `typing`. On connect each
  socket joins its user room plus one room per conversation, which is how
  REST handlers broadcast too (`server/src/sockets/chatEvents.ts`).
- **Unread & receipts** — `chat_participants.last_read_at` powers both the
  sidebar/nav unread badges and the "Seen" receipt under your last message.
  The nav badge refreshes (debounced) on live events, window focus, and
  reconnects.
- **Attachments** — uploaded first to the public `chat-attachments` storage
  bucket (created automatically on first upload; images and documents up to
  10 MB), then referenced by the message. Deleting a message clears its
  content, removes the stored file best-effort, and everyone keeps seeing
  "This message was deleted".
- **Permissions** — any member may rename a group or add members; removing
  someone else is reserved for the group owner and administrators; members
  may leave a group themselves. Direct conversations cannot be left. Message
  edit/delete is sender-only. All of this is enforced server-side.

Requires `supabase/migrations/0005_chat.sql`.

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

# Project structure

Full-stack restaurant monorepo (npm workspaces: `client` + `server`).

```text
wyndells/
├── client/                 # React 19 + Vite workspace
├── server/                 # Express + Supabase (PostgREST) workspace
├── supabase/
│   └── migrations/         # SQL migrations (schema, RLS, report functions)
├── package.json            # Root scripts (dev, build, lint, typecheck)
├── eslint.config.js        # Lint rules for client/** and server/**
└── .env                    # Environment (copy of .env.example)
```

## Client — `client/src`

Industry-standard React + Vite layout. The `@/` alias maps to `client/src`.

```text
client/src/
├── main.tsx                  # Vite entry: mounts App + global styles
├── app/
│   └── App.tsx               # Routes only (public / staff / dashboard)
├── assets/
│   └── images/               # Bundled images (hero, Vite/React samples)
├── components/
│   ├── ui/                   # shadcn/ui primitives (generated — do not hand-edit)
│   ├── common/               # Shared app components: Brand, Navbar, Footer,
│   │                         # FormControls, PageHeader, StatusBadges, Modal,
│   │                         # AvatarPicker, UserAvatar, StatCard
│   ├── layout/               # Route layouts (PublicLayout, DashboardLayout)
│   └── auth/                 # Route guards (RequireAuth)
├── features/                 # Domain folders, each with a components/ barrel
│   ├── auth/                 # Staff login page
│   ├── branches/
│   ├── careers/
│   ├── feedback/
│   ├── menu/
│   ├── overview/             # Dashboard charts + sections
│   ├── reservations/         # Forms, detail view, table assignment
│   ├── tables/
│   └── users/
├── pages/
│   ├── public/               # Route-level public pages (*Page.tsx)
│   └── dashboard/            # Route-level staff pages (*Page.tsx)
├── contexts/                 # React context providers (AuthContext)
├── services/
│   └── api/                  # HTTP client (client.ts) + per-domain API modules
├── types/                    # Shared TypeScript domain types
├── utils/                    # format, receipt (PDF), cn (Tailwind merge)
├── hooks/                    # Shared hooks (useMobile)
└── styles/                   # Global CSS (Tailwind v4 theme + design tokens)
```

### Conventions

- `components/ui/` holds generated shadcn/ui primitives; app-specific shared UI
  belongs in `components/common/`.
- Domain UI lives in `features/<domain>/components/` and is re-exported through
  that folder's `index.ts` barrel.
- Files in `pages/` stay thin: data loading + composition only.
- Cross-folder imports use the `@/` alias (never `../../..`).

## Server — `server/src`

```text
server/src/
├── server.ts                 # Express app + listen (entry for tsx)
├── config/
│   └── database.ts           # Supabase client (PostgREST)
├── constants/                # Shared enums, limits, status transitions
├── models/                   # Row types + API serializers (one per table)
├── services/                 # Supabase queries (one file per domain)
├── controllers/              # Thin HTTP adapters over services
├── routes/                   # Express routers mounted under /api/*
├── middleware/               # auth, uploads, errorHandler
├── utils/                    # ApiError, asyncHandler, validate, pick, reference
└── db/
    ├── seed.ts               # Seed script (npm run seed --workspace server)
    └── data/
        └── branches.json     # Static branch snapshot used by the seed
```

### Conventions

- Layering: `routes → controllers → services → models/config` — controllers
  never touch Supabase directly.
- Scripts in `server/package.json` point at `src/server.ts` and `src/db/seed.ts`.
- The server loads `.env` from the repo root (three levels up from `src/db`).


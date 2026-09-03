# Wyndell's

Full-stack **MERN** monorepo — **M**ongoDB, **E**xpress, **R**eact, **N**ode.
Built with npm workspaces: the client and server are separate workspaces installed from the root.

## Stack

| Layer    | Tech                                            |
| -------- | ----------------------------------------------- |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4     |
| Backend  | Node.js, Express, TypeScript (run with tsx)     |
| Database | MongoDB via Mongoose                            |

## Project layout

```
wyndells/
├── package.json        # root: scripts to run everything + lint tooling
├── .env.example        # copy to .env and configure
├── client/             # React frontend (Vite workspace)
│   ├── src/            # components, pages, styles
│   ├── public/         # static assets
│   ├── index.html
│   ├── vite.config.ts  # dev proxy: /api -> http://localhost:5000
│   └── package.json
└── server/             # Express API (workspace)
    ├── index.ts        # app entry
    ├── config/db.ts    # Mongoose connection
    ├── models/         # Mongoose models
    ├── routes/         # Express route handlers
    └── package.json
```

## Getting started

1. Install dependencies (once, from the root — npm workspaces install both packages):

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   copy .env.example .env
   ```

   Edit `.env` and point `MONGODB_URI` at your database (a local `mongod`
   instance or a MongoDB Atlas cluster). If no database is reachable, the API
   still starts so you can keep working on the frontend.

3. Run both dev servers from the project root:

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

## Starter API

| Method | Path              | Description                 |
| ------ | ----------------- | --------------------------- |
| GET    | `/api/health`     | Server + database status    |
| GET    | `/api/items`      | List all items              |
| POST   | `/api/items`      | Create an item              |
| GET    | `/api/items/:id`  | Get a single item           |
| PUT    | `/api/items/:id`  | Update an item              |
| DELETE | `/api/items/:id`  | Delete an item              |

`server/models/Item.ts` and `server/routes/items.ts` are a minimal CRUD
template — copy and adapt them for your real domain models.
>>>>>>> Stashed changes

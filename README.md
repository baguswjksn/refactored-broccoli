# Tasklane (pm-web)

React frontend for [pm-api](../pm-api): workspaces, boards, lists and cards with drag-and-drop.

## Run

Start the API first (see `../pm-api/README.md`, it listens on port 3000), then:

```sh
npm install
npm run dev        # http://localhost:5173
```

In development, Vite proxies `/api/*` to `http://localhost:3000` (override with `API_URL=... npm run dev`).

## Build

```sh
VITE_API_URL=https://your-api.example.com npm run build   # outputs dist/
```

When the frontend and API are on different origins, add the frontend origin to `CORS_ORIGIN` in the API's `.env`.

## Features

- Sign up / log in, profile and password settings
- Home: invitations, starred and recently viewed boards, workspaces
- Workspaces: boards, members (invite by username or email, promote, remove, leave), settings
- Boards: lists and cards with drag-and-drop (cards between lists, list reordering), rename inline,
  background, visibility, collaborators and their privileges, star, delete
- Cards: description, labels, members, due date, checklist, cover color or image, links,
  comments and activity; "move to list" for touch devices
- Read-only UI for users with view access; light and dark mode follow the system setting

# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Key commands

### Install dependencies
- Frontend: `cd client && npm install`
- Backend: `cd server && npm install`

The root `package.json` is only metadata and does not define a useful dev workflow; work from the `client` and `server` folders.

### Run the app locally
- Start the backend API and Socket.IO server (default port 4000):
  - `cd server && npm run dev`
- Start the Vite-powered React frontend (default port 5173):
  - `cd client && npm run dev`

In development you will typically run both commands in separate terminals. The frontend connects to the backend via Socket.IO and HTTP.

### Build and preview the frontend
- Production build:
  - `cd client && npm run build`
- Preview the production build locally (served by Vite):
  - `cd client && npm run preview`

### Run the backend for production
- Start the backend using the same entrypoint as in development:
  - `cd server && npm start`

### Environment configuration
- Backend (`server/index.js`):
  - `PORT` — port for the Express/Socket.IO server (defaults to `4000`).
  - `CORS_ORIGIN` — allowed origin for CORS (defaults to `*`).
- Frontend (`client/src/socket/SocketProvider.jsx`, `client/src/pages/LandingPage.jsx`):
  - `VITE_BACKEND_URL` — base URL of the backend used by Socket.IO and HTTP calls (defaults to `http://localhost:4000`).

### Tests and linting
- There are currently **no test or lint scripts** defined in any `package.json`.
- Running `npm test` in the repo root will fail with the placeholder script from `package.json`.

If you add a test or linting setup in the future, prefer wiring it through `client/package.json` and/or `server/package.json` scripts and update this section.

## Architecture overview

### Top-level layout
- `client/` — Vite + React single-page application that implements the drawing UI, chat, and lobby/room flows.
- `server/` — Node.js (ES modules) backend using Express and Socket.IO. All game state is kept **in memory** for a single server process.

There is no shared code between `client` and `server` today; they communicate purely over HTTP and Socket.IO events.

### Backend (`server/`)
- Entry point: `server/index.js`.
- Express is used for a small HTTP surface:
  - `GET /health` — health check returning `{ ok: true }`.
  - `POST /rooms` — creates a room given an existing Socket.IO connection ID (`socketId`). The handler:
    - looks up the connected socket by `socketId` on the Socket.IO server,
    - creates a new in-memory room with settings merged from defaults,
    - registers the host player and joins them to the room,
    - broadcasts the initial `room:state` to the room,
    - returns `{ ok: true, roomId, state }`.
- Socket.IO server:
  - Created on top of the HTTP server and configured with the same CORS origin as Express.
  - Maintains an in-memory `rooms` map. Each room tracks:
    - `id`, `hostId`, `settings` (max points, round time, words per round, max players),
    - `players` (Map of per-player state including `score`, `debt`, `isHost`, `isDrawer`),
    - `status` (`LOBBY`, `IN_ROUND`, `ROUND_RESULTS`, etc.),
    - `currentRound` (drawer, chosen word, end time, strokes, guess order).
  - The helper `roomSnapshot(room)` converts internal room state into a JSON-serializable object that the client consumes.
- Core Socket.IO event groups:
  - **Room lifecycle**: `room:create` (socket-initiated room), `room:join`, `room:kick`, `room:state`, `room:closed`.
  - **Game flow**: `game:start`, `round:wordOptions` (to the drawer only), `round:selectWord`, `round:start`, `round:end`.
  - **Drawing and chat**: `draw:stroke`, `draw:clear`, `chat:message`, plus server-sent `guess:correct` for correct guesses.
- Scoring and rounds:
  - `scoreSequence(maxPoints)` generates a descending score sequence so that earlier correct guessers earn more points.
  - `endRoundAndScore(room, reason)` computes scores for the round:
    - awards points to guessers based on guess order and score sequence,
    - conditionally penalizes or rewards the drawer,
    - transitions the room to `ROUND_RESULTS` and emits `round:end` with the final state.
- Disconnect handling:
  - On `disconnect`, the server removes the socket from any rooms it was part of.
  - If the disconnecting socket was the host, the room is destroyed and `room:closed` is emitted to remaining clients; otherwise, the updated `room:state` is broadcast.

When modifying backend behavior, keep the `roomSnapshot` shape and the emitted event names in sync with the client expectations described below.

### Frontend (`client/`)

#### Entry and routing
- Entry point: `client/src/main.jsx`.
  - Creates the React root and wraps the app in:
    - `SocketProvider` — provides a live Socket.IO connection and room state via context.
    - `BrowserRouter` — React Router based routing.
  - Routes:
    - `/` → `LandingPage` (lobby and room creation/join flow).
    - `/room/:roomId` → `RoomPage` (main game UI for a specific room).

#### Realtime state and socket integration
- `SocketProvider` (`client/src/socket/SocketProvider.jsx`):
  - Connects to the backend using Socket.IO at `VITE_BACKEND_URL` (or `http://localhost:4000`).
  - Tracks `socket`, the current `roomState` (from server `room:state` / `round:end` events), and `selfId` (socket ID).
  - Exposes these via React context and enforces usage via the `useSocket()` hook.
  - Resets `roomState` to `null` on `room:closed` or `room:kicked`.

Any component that needs access to the current room or socket should consume `useSocket()` instead of creating its own connection.

#### Pages
- `LandingPage` (`client/src/pages/LandingPage.jsx`):
  - Allows the user to:
    - Configure game settings (max points, round time, number of word options).
    - Create a room by POSTing to `POST /rooms` with `{ socketId, name, settings }`.
    - Join an existing room via `socket.emit('room:join', { roomId, name }, cb)`.
  - On successful create/join, updates `roomState` via `setRoomState` and routes to `/room/:roomId`.
- `RoomPage` (`client/src/pages/RoomPage.jsx`):
  - Derives the current player (`me`) from `roomState.players` and `selfId` to determine host/drawer roles.
  - Listens for `round:wordOptions` and shows a word selection modal to the drawer.
  - Provides host controls to start and end rounds (`game:start`, `round:end`).
  - Composes the main layout from:
    - `PlayersSidebar` (player list and host-only kick controls),
    - `DrawingCanvas` (shared drawing surface),
    - `ChatBox` (guess/chat interface).

#### Key UI components
- `DrawingCanvas` (`client/src/ui/DrawingCanvas.jsx`):
  - HTML canvas-based drawing surface.
  - Drawer-only interaction; emits `draw:stroke` and `draw:clear` events to the server.
  - Listens to server `draw:stroke` / `draw:clear` to render strokes and synchronize state across clients.
- `ChatBox` (`client/src/ui/ChatBox.jsx`):
  - Listens to `chat:message` events and appends messages to a scrollable chat history.
  - Sends guesses via `chat:message` events emitted to the server.
- `PlayersSidebar` (`client/src/ui/PlayersSidebar.jsx`):
  - Renders the player list, highlighting the current user, host, and active drawer.
  - Shows the room code (from route param) so it can be shared with others.
  - Enables the host to kick players via `room:kick`.

### Client–server contract (summary)

When working across the client and server, the most important contracts to keep in mind are:
- **Room state shape**: the object returned by `roomSnapshot` in `server/index.js` drives most UI rendering in `RoomPage` and `PlayersSidebar`.
- **Room creation/join flow**:
  - Socket must connect first (to obtain `selfId`),
  - then `POST /rooms` (for create) or `room:join` (for join),
  - then client navigates to `/room/:roomId` and relies on `room:state` updates.
- **Round lifecycle**: `game:start` → server picks drawer and word options → `round:wordOptions` to drawer → `round:selectWord` → `round:start` broadcast → chat guesses and drawing events → `round:end` → `ROUND_RESULTS` state and scoring.

Any significant feature work (e.g., persistence, spectating, authentication) will likely require coordinated changes to both the server event handlers and the client components that consume `roomState` and socket events.

# 🏆 Productivity Leaderboard

A real-time team productivity leaderboard that integrates with **Super Productivity**.

---

## System Architecture

```
Super Productivity App
  └─ plugin.js  →  POST /update-time  →  server.js  →  Socket.IO  →  index.html (dashboard)
```

---

## Quick Start

### 1. Backend Server

```bash
# Install dependencies
npm install

# Start the server
npm start
# → Running on http://localhost:3000
```

### 2. Dashboard

Open `index.html` in your browser, or serve it statically:

```bash
# Serve the dashboard alongside the API (add this to server.js):
# app.use(express.static(__dirname));
# Then visit: http://localhost:3000
```

### 3. Super Productivity Plugin

1. Open Super Productivity settings → Plugins
2. Add a new plugin pointing to `manifest.json`
3. On first load, enter your display name when prompted
4. The floating **🏆 Leaderboard** button appears bottom-right

---

## File Structure

```
manifest.json   — Plugin metadata
plugin.js       — Super Productivity plugin (runs inside the app)
server.js       — Node.js backend (Express + Socket.IO)
index.html      — Dashboard UI (standalone HTML, no build step)
package.json    — Server dependencies
```

---

## Configuration

In `plugin.js`, update these constants at the top:

```js
const SERVER_URL   = 'http://localhost:3000';     // Your server URL
const DASHBOARD_URL = 'http://localhost:3000';    // Dashboard URL
```

---

## Rank System

| Hours | Badge        |
|-------|-------------|
| 15h+  | 👑 Legend   |
| 12h+  | 🔥 Master   |
| 10h+  | 💎 Diamond  |
|  9h+  | 🥇 Gold+    |
|  7h+  | 🥇 Gold     |
|  5h+  | 🥈 Silver   |
|  3h+  | 🥉 Bronze   |
|  1h+  | ⭐ Starter  |

---

## API

| Method | Route           | Description                  |
|--------|----------------|------------------------------|
| POST   | `/update-time`  | Plugin sends time update     |
| GET    | `/leaderboard`  | Fetch current leaderboard    |
| GET    | `/health`       | Server health check          |

### POST /update-time payload

```json
{
  "username": "Alice",
  "taskName": "Fix login bug",
  "totalTime": 12800000
}
```

---

## Socket.IO Events

| Event         | Direction          | Payload            |
|---------------|--------------------|--------------------|
| `leaderboard` | Server → Dashboard | Sorted users array |
| `heartbeat`   | Client → Server    | `{ username }`     |

---

## Features

- ✅ Real-time Socket.IO updates
- ✅ Live ticking timers (second-by-second, no server needed)
- ✅ Auto-pruning of inactive users (5 min timeout)
- ✅ Daily leaderboard reset at midnight
- ✅ Rank-up confetti animation
- ✅ Floating leaderboard button in Super Productivity
- ✅ MutationObserver to persist button through Angular re-renders
- ✅ Glassmorphism dark UI
- ✅ Responsive layout

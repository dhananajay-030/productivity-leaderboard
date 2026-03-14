/**
 * ============================================================
 *  🏆 Productivity Leaderboard — Server
 * ============================================================
 *  HOW TO RUN:
 *    1. Put server.js and index.html in the same folder
 *    2. npm install express socket.io cors
 *    3. node server.js
 *    4. Open http://localhost:3000 in your browser
 *
 *  SHARING WITH FRIENDS (pick one):
 *    A) Same WiFi  → give them your local IP shown on startup
 *                    e.g. http://192.168.1.42:3000
 *    B) Internet   → deploy to Railway / Render / any VPS
 *    C) Quick tunnel (no server needed):
 *         npx localtunnel --port 3000
 *       or
 *         npx ngrok http 3000
 *       → gives a public https URL instantly, share that link
 * ============================================================
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ─── Socket.IO Setup ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname)));
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
// ─── In-Memory Store ─────────────────────────────────────────────────────────
/**
 * users: { [username]: { username, taskName, totalTime, lastSeen, socketIds[] } }
 */
const users = {};

// Inactive timeout: remove users not seen for 5 minutes
const INACTIVE_TIMEOUT_MS = 5 * 60 * 1000;

// Daily reset: schedule at midnight
function scheduleDailyReset() {
  const now = new Date();
  const msUntilMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) - now;
  setTimeout(() => {
    console.log('[RESET] Daily leaderboard reset triggered.');
    for (const key in users) delete users[key];
    broadcastLeaderboard();
    scheduleDailyReset(); // re-schedule for next midnight
  }, msUntilMidnight);
  console.log(`[RESET] Next daily reset in ${Math.round(msUntilMidnight / 60000)} minutes.`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build sorted leaderboard array from in-memory store */
function buildLeaderboard() {
  return Object.values(users)
    .sort((a, b) => b.totalTime - a.totalTime)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

/** Broadcast current leaderboard to all connected dashboards */
function broadcastLeaderboard() {
  const leaderboard = buildLeaderboard();
  io.emit('leaderboard', leaderboard);
  console.log(`[BROADCAST] Leaderboard sent to ${io.engine.clientsCount} client(s).`);
}

/** Prune users who haven't sent an update in INACTIVE_TIMEOUT_MS */
function pruneInactiveUsers() {
  const cutoff = Date.now() - INACTIVE_TIMEOUT_MS;
  let changed = false;
  for (const [key, user] of Object.entries(users)) {
    if (user.lastSeen < cutoff) {
      console.log(`[PRUNE] Removing inactive user: ${key}`);
      delete users[key];
      changed = true;
    }
  }
  if (changed) broadcastLeaderboard();
}

// Prune every 60 seconds
setInterval(pruneInactiveUsers, 60_000);

// ─── Routes ──────────────────────────────────────────────────────────────────

/** Health check */
app.get('/health', (_req, res) => res.json({ status: 'ok', users: Object.keys(users).length }));

/** Receive time update from Super Productivity plugin */
app.post('/update-time', (req, res) => {
  const { username, taskName, totalTime } = req.body;

  if (!username || typeof totalTime !== 'number') {
    return res.status(400).json({ error: 'Invalid payload. username and totalTime are required.' });
  }

  const prev = users[username];
  users[username] = {
    username,
    taskName: taskName || 'Unknown task',
    totalTime,
    lastSeen: Date.now(),
    // detect rank-up for confetti event
    prevTotalTime: prev ? prev.totalTime : 0,
  };

  console.log(`[UPDATE] ${username} → ${taskName} | ${(totalTime / 3600000).toFixed(2)}h`);

  broadcastLeaderboard();
  res.json({ success: true, rank: buildLeaderboard().findIndex(u => u.username === username) + 1 });
});

/** Return current leaderboard via HTTP (for initial dashboard load) */
app.get('/leaderboard', (_req, res) => {
  res.json(buildLeaderboard());
});

// ─── Socket.IO Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // Send current state immediately on connect
  socket.emit('leaderboard', buildLeaderboard());

  // Heartbeat: client pings every 25s to confirm presence
  socket.on('heartbeat', ({ username }) => {
    if (username && users[username]) {
      users[username].lastSeen = Date.now();
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🏆  Leaderboard server running on http://localhost:${PORT}`);
  console.log(`   POST /update-time  — receive plugin updates`);
  console.log(`   GET  /leaderboard  — fetch current leaderboard\n`);
  scheduleDailyReset();
});

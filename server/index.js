import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyCredentials, signToken, verifyToken, isAdminRole } from './auth.js';
import { getState, dispatchAction } from './store.js';

const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

function getOnlineCount() {
  return io.sockets.sockets.size;
}

function broadcastState() {
  io.emit('state:sync', { state: getState(), online: getOnlineCount() });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, online: getOnlineCount() });
});

app.get('/api/state', (_req, res) => {
  res.json({ state: getState(), online: getOnlineCount() });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Thiếu username hoặc password' });
  }
  const cred = verifyCredentials(username, password);
  if (!cred) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  const token = signToken(cred.username, cred.role);
  res.json({ token, username: cred.username, role: cred.role });
});

app.get('/api/auth/me', (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.json({ authenticated: false });
  const payload = verifyToken(token);
  if (!payload) return res.json({ authenticated: false });
  res.json({
    authenticated: true,
    username: payload.username,
    role: payload.role,
  });
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const payload = token ? verifyToken(token) : null;
  socket.role = payload?.role ?? null;
  socket.isAdmin = isAdminRole(payload?.role);
  socket.username = payload?.username ?? 'guest';
  next();
});

io.on('connection', (socket) => {
  socket.emit('state:sync', {
    state: getState(),
    online: getOnlineCount(),
  });
  io.emit('presence:update', { online: getOnlineCount() });

  socket.on('state:action', (action, ack) => {
    const result = dispatchAction(action, {
      isAdmin: socket.isAdmin,
    });
    if (!result.ok) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    broadcastState();
    ack?.({ ok: true });
  });

  socket.on('disconnect', () => {
    io.emit('presence:update', { online: getOnlineCount() });
  });
});

const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

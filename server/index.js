import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyToken, isAdminRole } from './auth.js';
import { createApp } from './createApp.js';
import { getState, dispatchAction, initStore } from './store.js';
import { storageMode } from './stateRepo.js';

const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

await initStore();

const app = createApp();

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

  socket.on('state:action', async (action, ack) => {
    try {
      const result = await dispatchAction(action, {
        isAdmin: socket.isAdmin,
      });
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      broadcastState();
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message || 'Lỗi server' });
    }
  });

  socket.on('disconnect', () => {
    io.emit('presence:update', { online: getOnlineCount() });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Storage: ${storageMode()}`);
});

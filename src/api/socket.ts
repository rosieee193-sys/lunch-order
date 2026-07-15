import { io, Socket } from 'socket.io-client';
import type { StateAction } from '../types';

let socket: Socket | null = null;

export function getSocket(token: string | null): Socket {
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io({
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitAction(action: StateAction): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const s = socket;
    if (!s?.connected) {
      resolve({ ok: false, error: 'Chưa kết nối server' });
      return;
    }
    s.emit('state:action', action, (result: { ok: boolean; error?: string }) => {
      resolve(result ?? { ok: false, error: 'Không nhận được phản hồi' });
    });
  });
}

export function reconnectSocket(token: string | null) {
  if (socket) {
    socket.auth = { token };
    socket.disconnect().connect();
  }
}

'use client';
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_GATEWAY_URL || '',
      { transports: ['websocket', 'polling'] }
    );
  }
  return socket;
}
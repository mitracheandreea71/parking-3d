import { WS_URL } from "../config";
import { io } from "socket.io-client";

let socket = null;

export function connectSocket() {
  if (!socket) {
    socket = io(WS_URL, { transports: ["websocket"] });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onEvent(event, handler) {
  if (!socket) throw new Error("Socket not connected");
  socket.on(event, handler);
}

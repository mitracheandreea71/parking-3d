import { WS_URL } from "../config";
import { io } from "socket.io-client";
import { getToken } from "../api";

let socket = null;

export function connectSocket() {
  if (!socket) {
    const token = getToken();
    socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      auth: token ? { token } : undefined,
    });

    socket.on("connect_error", (error) => {
      console.error("[PARKING] Socket connect error:", error.message);
    });
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

  return () => {
    if (socket) {
      socket.off(event, handler);
    }
  };
}

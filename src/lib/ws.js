import { WS_URL } from "../config";
export function connectWS(onMessage) {
  const ws = new WebSocket(WS_URL);
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    onMessage?.(msg);
  };
  return ws;
}

function getRequiredEnv(name) {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required Vite environment variable: ${name}`);
  }
  return value;
}

export const LEVELS = 3;
export const FLOOR_W = 40;
export const FLOOR_H = 30;
export const FLOOR_CLEAR = 3.98;
export const SLAB_T = 0.3;
export const LANE_W = 6;
export const RAIL_H = 1.2;
export const API_URL = getRequiredEnv("VITE_API_URL");
export const WS_URL = import.meta.env.VITE_WS_URL;
// Colors
export const CONCRETE = "#8b8b8b";
export const ASPHALT = "#2a2a2a";
export const ROOF = "#404040";
export const RAIL = "#666666";
export const LINE = "#ffff00";
export const SELECT_FILL = "#00ff00";

export const colorForStatus = (status) => {
  if (status === "free") return "#10b981";
  if (status === "occupied") return "#ef4444";
  if (status === "reserved") return "#808080";
  return "#6b7280";
};

import { FLOOR_W, FLOOR_H } from "../config";

export function makeSpots() {
  const leftStartX = 1.5;
  const rightStartX = FLOOR_W - 1.5 - 2.5;
  const cols = 12;
  const gap = 3.2;

  const spotsLeft = Array.from({ length: cols }, (_, i) => ({
    id: `L${i + 1}`,
    x: leftStartX + i * gap,
    y: 1.5,
    w: 2.5,
    h: 5,
    rot: 0,
    kind: i % 10 === 1 ? "EV" : i % 9 === 2 ? "DIS" : "STD",
    status: "free",
  }));

  const spotsRight = Array.from({ length: cols }, (_, i) => ({
    id: `R${i + 1}`,
    x: rightStartX - i * gap,
    y: FLOOR_H - 1.5 - 5,
    w: 2.5,
    h: 5,
    rot: 0,
    kind: i % 11 === 3 ? "EV" : i % 8 === 4 ? "DIS" : "STD",
    status: "free",
  }));

  return [...spotsLeft, ...spotsRight];
}

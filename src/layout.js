import { FLOOR_W } from "./config";

export const makeSpots = () => {
  const spots = [];
  const spotW = 2.5;
  const spotH = 5;
  const laneW = 6;
  const margin = 2;

  for (let i = 0; i < 2; i++) {
    const laneZ = margin + i * (spotH * 2 + laneW);

    // Stânga
    for (let j = 0; j < 7; j++) {
      const x = margin + j * (spotW + 0.3);
      spots.push({
        id: `${String.fromCharCode(65 + i)}${j + 1}`,
        x,
        y: laneZ,
        w: spotW,
        h: spotH,
        status:
          Math.random() > 0.5
            ? "free"
            : Math.random() > 0.5
            ? "occupied"
            : "reserved",
        kind:
          Math.random() > 0.85 ? (Math.random() > 0.5 ? "EV" : "DIS") : "STD",
      });
    }

    // Dreapta
    for (let j = 0; j < 7; j++) {
      const x = FLOOR_W - margin - (j + 1) * (spotW + 0.3);
      spots.push({
        id: `${String.fromCharCode(67 + i)}${j + 1}`,
        x,
        y: laneZ,
        w: spotW,
        h: spotH,
        status:
          Math.random() > 0.5
            ? "free"
            : Math.random() > 0.5
            ? "occupied"
            : "reserved",
        kind:
          Math.random() > 0.85 ? (Math.random() > 0.5 ? "EV" : "DIS") : "STD",
      });
    }
  }
  return spots;
};

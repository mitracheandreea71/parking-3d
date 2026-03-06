import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import UiOverlay from "./components/UiOverlay";
import ParkingLevel from "./components/ParkingLevel";
import { LEVELS, FLOOR_W, FLOOR_H, FLOOR_CLEAR } from "./config";

import { apiGet } from "./api";
import { toLocalISOStringNoZ } from "./time";

export default function App() {
  const [levels, setLevels] = useState(
    Array.from({ length: LEVELS }, (_, i) => ({ id: i, spots: [] }))
  );

  const [activeLevel, setActiveLevel] = useState(0);
  const [isolate, setIsolate] = useState(false);
  const [selected, setSelected] = useState(null); // { level, id } unde id = code (ex: L1)

  // interval selectat (local time)
  const [start, setStart] = useState(() => new Date());
  const [end, setEnd] = useState(() => new Date(Date.now() + 60 * 60 * 1000));

  // 1) Load layout (spots) din DB
  useEffect(() => {
    (async () => {
      const spots = await apiGet("/parking/spots");

      const grouped = Array.from({ length: LEVELS }, (_, i) => ({
        id: i,
        spots: [],
      }));

      for (const s of spots) {
        // backend: levelId este 1..3 => în UI: 0..2
        const levelIndex = (s.levelId ?? 1) - 1;
        if (!grouped[levelIndex]) continue;

        grouped[levelIndex].spots.push({
          // păstrăm tot ce vine din API (x,y,z,w,h,rot)
          ...s,

          // IMPORTANT: în proiectul tău, Spot/label/selection folosesc spot.id
          // noi îl setăm la cod (L1, R2 etc.)
          id: s.code,

          // păstrăm spotId numeric pentru mapare status
          spotId: s.spotId,

          // status inițial
          status: "free",
        });
      }

      setLevels(grouped);
    })().catch(console.error);
  }, []);

  // 2) Load availability când se schimbă intervalul
  useEffect(() => {
    // dacă încă nu avem spoturi, nu apelăm
    if (!levels.some((lvl) => lvl.spots.length > 0)) return;

    (async () => {
      const startStr = toLocalISOStringNoZ(start); // FĂRĂ Z (timezone fix)
      const endStr = toLocalISOStringNoZ(end);

      const avail = await apiGet(
        `/parking/availability?start=${encodeURIComponent(
          startStr
        )}&end=${encodeURIComponent(endStr)}&extendMinutes=60`
      );

      const map = new Map(avail.map((a) => [a.spotId, a.status]));

      setLevels((prev) =>
        prev.map((lvl) => ({
          ...lvl,
          spots: lvl.spots.map((s) => ({
            ...s,
            status: map.get(s.spotId) ?? "free",
          })),
        }))
      );
    })().catch(console.error);
  }, [start, end, levels]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <UiOverlay
        activeLevel={activeLevel}
        setActiveLevel={setActiveLevel}
        isolate={isolate}
        setIsolate={setIsolate}
        selected={selected}
        onClear={() => setSelected(null)}
        start={start}
        end={end}
        setStart={setStart}
        setEnd={setEnd}
      />

      <Canvas
        camera={{ position: [FLOOR_W * 0.55, 22, FLOOR_H * 1.8], fov: 50 }}
      >
        <hemisphereLight args={["#ffffff", "#9ca3af", 0.35]} />
        <directionalLight position={[60, 60, 20]} intensity={0.7} />
        <pointLight
          position={[FLOOR_W * 0.5, 4, FLOOR_H * 0.5]}
          intensity={0.2}
          distance={70}
        />

        {levels.map((lvl, idx) => {
          const y = idx * FLOOR_CLEAR;
          const visible = isolate ? idx === activeLevel : true;

          return (
            <ParkingLevel
              key={idx}
              index={idx}
              y={y}
              spots={lvl.spots}
              visible={visible}
              dim={!isolate && idx !== activeLevel}
              selected={selected}
              // aici setăm selection cu code-ul spotului (s.id = "L1")
              setSelected={(spotCode) =>
                setSelected({ level: idx, id: spotCode })
              }
            />
          );
        })}

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}

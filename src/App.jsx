import { useEffect, useMemo, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import UiOverlay from "./components/UiOverlay";
import ParkingLevel from "./components/ParkingLevel";
import { LEVELS, FLOOR_W, FLOOR_H, FLOOR_CLEAR } from "./config";

import { apiGet } from "./api";
import { toLocalISOStringNoZ } from "./time";

function readQueryDate(paramName) {
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get(paramName);
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

const REFRESH_INTERVAL_MS = 30_000; // 30 secunde

export default function App() {
  const [levels, setLevels] = useState(
    Array.from({ length: LEVELS }, (_, i) => ({ id: i, spots: [] }))
  );

  const [activeLevel, setActiveLevel] = useState(0);
  const [isolate, setIsolate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null); // timestamp ultimul refresh

  const [start, setStart] = useState(
    () => readQueryDate("start") ?? new Date()
  );
  const [end, setEnd] = useState(
    () => readQueryDate("end") ?? new Date(Date.now() + 60 * 60 * 1000)
  );

  const spotByCode = useMemo(() => {
    const m = new Map();
    for (const lvl of levels) for (const s of lvl.spots) m.set(s.id, s);
    return m;
  }, [levels]);

  // 1) Load layout
  useEffect(() => {
    (async () => {
      const spots = await apiGet("/parking/spots");
      const grouped = Array.from({ length: LEVELS }, (_, i) => ({
        id: i,
        spots: [],
      }));
      for (const s of spots) {
        const levelIndex = (s.levelId ?? 1) - 1;
        if (!grouped[levelIndex]) continue;
        grouped[levelIndex].spots.push({
          ...s,
          id: s.code,
          spotId: s.spotId,
          status: "free",
        });
      }
      setLevels(grouped);
    })().catch(console.error);
  }, []);

  // 2) Fetch availability (refolosit atât la mount cât și la refresh automat)
  const fetchAvailability = useCallback(async () => {
    if (!levels.some((lvl) => lvl.spots.length > 0)) return;
    const startStr = toLocalISOStringNoZ(start);
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
    setLastUpdated(new Date());
  }, [start, end, levels]);

  // La schimbare interval
  useEffect(() => {
    fetchAvailability().catch(console.error);
  }, [start, end]);

  // Refresh automat la 30s
  useEffect(() => {
    const id = setInterval(() => {
      fetchAvailability().catch(console.error);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchAvailability]);

  // 3) postMessage când se selectează un spot
  useEffect(() => {
    if (!selected) return;
    const spot = spotByCode.get(selected.id);
    if (!spot) return;
    const payload = {
      type: "spot_selected",
      code: spot.id,
      spotId: spot.spotId,
      start: toLocalISOStringNoZ(start),
      end: toLocalISOStringNoZ(end),
    };
    try {
      if (window.ReactNativeWebView?.postMessage)
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch (e) {
      console.error("postMessage failed", e);
    }
  }, [selected, spotByCode, start, end]);

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
        lastUpdated={lastUpdated}
        onRefresh={() => fetchAvailability().catch(console.error)}
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

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import UiOverlay from "./components/UiOverlay";
import ParkingLevel from "./components/ParkingLevel";
import { LEVELS, FLOOR_W, FLOOR_H, FLOOR_CLEAR } from "./config";

import { apiGet, apiPost } from "./api";
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

function readQueryString(paramName) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(paramName);
  } catch {
    return null;
  }
}

export default function App() {
  const modeParam = (readQueryString("mode") || "projection").toLowerCase();
  const mode =
    modeParam === "live"
      ? "live"
      : modeParam === "reservation"
        ? "reservation"
        : modeParam === "subscription"
          ? "subscription"
          : "projection";
  const subscriptionPlan = readQueryString("subscriptionPlan");
  const canSelectSpots = mode === "reservation" || mode === "subscription";
  const isLiveMode = mode === "live";
  const [levels, setLevels] = useState(
    Array.from({ length: LEVELS }, (_, i) => ({ id: i, spots: [] })),
  );

  const [activeLevel, setActiveLevel] = useState(0);
  const [isolate, setIsolate] = useState(false);
  const [selected, setSelected] = useState(null); // { level, id } unde id = code (ex: L1)

  // interval selectat (local time)
  const [start, setStart] = useState(
    () => readQueryDate("start") ?? new Date(),
  );
  const [end, setEnd] = useState(
    () => readQueryDate("end") ?? new Date(Date.now() + 60 * 60 * 1000),
  );
  const [refreshTick, setRefreshTick] = useState(0);
  const projectionRequestRef = useRef(0);

  useEffect(() => {
    if (!isLiveMode) return;
    const intervalId = window.setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [isLiveMode]);

  useEffect(() => {
    if (canSelectSpots) return;
    setSelected(null);
  }, [canSelectSpots]);

  // convenient map from code -> spot (includes numeric spotId)
  const spotByCode = useMemo(() => {
    const m = new Map();
    for (const lvl of levels) {
      for (const s of lvl.spots) m.set(s.id, s);
    }
    return m;
  }, [levels]);

  const hasSpots = useMemo(
    () => levels.some((lvl) => lvl.spots.length > 0),
    [levels],
  );

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

  // 2) Load projection când se schimbă intervalul.
  // În live mode facem refresh periodic la 10s cu fereastră glisantă now -> now+60m.
  useEffect(() => {
    // dacă încă nu avem spoturi, nu apelăm
    if (!hasSpots) return;

    (async () => {
      const requestId = ++projectionRequestRef.current;
      const effectiveStart = isLiveMode ? new Date() : start;
      const effectiveEnd = isLiveMode
        ? new Date(effectiveStart.getTime() + 60 * 60 * 1000)
        : end;

      const startStr = toLocalISOStringNoZ(effectiveStart); // FĂRĂ Z (timezone fix)
      const endStr = toLocalISOStringNoZ(effectiveEnd);

      // Backend projection accepts reservation/subscription mode.
      const projectionMode =
        mode === "subscription" ? "subscription" : "reservation";

      const projection = await apiPost("/parking/projection", {
        mode: projectionMode,
        start: startStr,
        end: endStr,
        subscriptionPlan,
      });

      const map = new Map(projection.map((p) => [p.spotId, p.status]));

      // Ignore late responses from older requests to prevent status flicker.
      if (requestId !== projectionRequestRef.current) return;

      setLevels((prev) =>
        prev.map((lvl) => ({
          ...lvl,
          spots: lvl.spots.map((s) => ({
            ...s,
            status: map.get(s.spotId) ?? "free",
          })),
        })),
      );
    })().catch(console.error);
  }, [start, end, refreshTick, isLiveMode, mode, subscriptionPlan, hasSpots]);

  // 3) When selection changes, notify React Native (WebView) if present
  useEffect(() => {
    if (!selected) return;
    const spot = spotByCode.get(selected.id);
    if (!spot) return;

    const payload = {
      type: "spot_selected",
      code: spot.id,
      spotId: spot.spotId,
      mode,
      subscriptionPlan,
      start: toLocalISOStringNoZ(isLiveMode ? new Date() : start),
      end: toLocalISOStringNoZ(
        isLiveMode ? new Date(Date.now() + 60 * 60 * 1000) : end,
      ),
    };

    try {
      if (window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    } catch (e) {
      console.error("postMessage failed", e);
    }
  }, [selected, spotByCode, start, end, isLiveMode, mode, subscriptionPlan]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 20,
          background: "rgba(10,14,26,0.92)",
          color: "#e2e8f4",
          border: "1px solid #1e293b",
          borderRadius: 10,
          padding: "6px 10px",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.2,
        }}
      >
        {isLiveMode
          ? "Parcare live"
          : mode === "reservation"
            ? "Parcare rezervare"
            : mode === "subscription"
              ? `Parcare abonament${subscriptionPlan ? ` (${subscriptionPlan})` : ""}`
              : "Parcare projection"}
      </div>

      <UiOverlay
        activeLevel={activeLevel}
        setActiveLevel={setActiveLevel}
        isolate={isolate}
        setIsolate={setIsolate}
        selected={selected}
        onClear={() => setSelected(null)}
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
              canSelectSpots={canSelectSpots}
              selected={selected}
              // aici setăm selection cu code-ul spotului (s.id = "L1")
              setSelected={(spotCode) =>
                setSelected((prev) =>
                  prev?.level === idx && prev?.id === spotCode
                    ? null
                    : { level: idx, id: spotCode },
                )
              }
            />
          );
        })}

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}

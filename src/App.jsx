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
  const [selected, setSelected] = useState(null); // { level, spotId, code }

  const [start, setStart] = useState(
    () => readQueryDate("start") ?? new Date(),
  );
  const [end, setEnd] = useState(
    () => readQueryDate("end") ?? new Date(Date.now() + 60 * 60 * 1000),
  );

  const [refreshTick, setRefreshTick] = useState(0);
  const projectionRequestRef = useRef(0);
  const [projectionReady, setProjectionReady] = useState(false);

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

  const hasSpots = useMemo(
    () => levels.some((lvl) => lvl.spots.length > 0),
    [levels],
  );

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
          status: null,
        });
      }

      setLevels(grouped);
    })().catch(console.error);
  }, []);

  useEffect(() => {
    if (!hasSpots) return;

    setProjectionReady(false);

    (async () => {
      const requestId = ++projectionRequestRef.current;

      const effectiveStart = isLiveMode ? new Date() : start;
      const effectiveEnd = isLiveMode
        ? new Date(effectiveStart.getTime() + 60 * 60 * 1000)
        : end;

      const startStr = toLocalISOStringNoZ(effectiveStart);
      const endStr = toLocalISOStringNoZ(effectiveEnd);

      const projectionMode =
        mode === "subscription" ? "subscription" : "reservation";

      const projection = await apiPost("/parking/projection", {
        mode: projectionMode,
        start: startStr,
        end: endStr,
        subscriptionPlan,
      });

      const map = new Map(projection.map((p) => [p.spotId, p.status]));

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

      setProjectionReady(true);
    })().catch(console.error);
  }, [start, end, refreshTick, isLiveMode, mode, subscriptionPlan, hasSpots]);

  useEffect(() => {
    if (!selected) return;

    const exists = levels.some(
      (lvl) =>
        lvl.id === selected.level &&
        lvl.spots.some((s) => s.id === selected.code),
    );

    if (!exists || !canSelectSpots) {
      setSelected(null);
    }
  }, [selected, levels, canSelectSpots]);

  useEffect(() => {
    if (!selected) return;

    const level = levels.find((lvl) => lvl.id === selected.level);
    const spot = level?.spots.find((s) => s.id === selected.code);
    if (!spot) return;

    const payload = {
      type: "spot_selected",
      code: spot.id,
      spotId: spot.spotId,
      level: selected.level,
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
  }, [selected, levels, start, end, isLiveMode, mode, subscriptionPlan]);
  const visibleLevel = canSelectSpots
    ? (selected?.level ?? activeLevel)
    : activeLevel;

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

      {!projectionReady && hasSpots && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 20,
            background: "rgba(15, 23, 42, 0.9)",
            color: "#e2e8f0",
            border: "1px solid #334155",
            borderRadius: 10,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Se incarca disponibilitatea locurilor...
        </div>
      )}

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

          const visible = canSelectSpots
            ? idx === visibleLevel
            : isolate
              ? idx === activeLevel
              : true;

          return (
            <ParkingLevel
              key={idx}
              index={idx}
              y={y}
              spots={lvl.spots}
              visible={visible}
              dim={!isolate && idx !== activeLevel}
              canSelectSpots={canSelectSpots && projectionReady}
              selected={selected}
              setSelected={(nextSelected) => {
                if (nextSelected?.level != null) {
                  setActiveLevel(nextSelected.level);
                }
                setSelected(nextSelected);
              }}
            />
          );
        })}

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}

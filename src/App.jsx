import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { connectSocket, disconnectSocket, onEvent } from "./lib/ws";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import UiOverlay from "./components/UiOverlay";
import ParkingLevel from "./components/ParkingLevel";
import { LEVELS, FLOOR_W, FLOOR_H, FLOOR_CLEAR } from "./config";

import { apiGet, apiPost } from "./api";

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
  // Socket.io-client pentru realtime

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
  const excludeReservationIdRaw = readQueryString("excludeReservationId");
  const excludeReservationId = excludeReservationIdRaw
    ? Number(excludeReservationIdRaw)
    : null;
  const canSelectSpots = mode === "reservation" || mode === "subscription";
  const isLiveMode = mode === "live";

  const [levels, setLevels] = useState(
    Array.from({ length: LEVELS }, (_, i) => ({ id: i, spots: [] })),
  );

  const [activeLevel, setActiveLevel] = useState(0);
  const [isolate, setIsolate] = useState(false);
  const [selected, setSelected] = useState(null); // { level, spotId, code }

  const [start] = useState(() => readQueryDate("start") ?? new Date());
  const [end] = useState(
    () => readQueryDate("end") ?? new Date(Date.now() + 60 * 60 * 1000),
  );

  const [refreshTick, setRefreshTick] = useState(0);
  const projectionRequestRef = useRef(0);
  const lastSelectionFingerprintRef = useRef(null);
  const lastLocalSelectionAtRef = useRef(0);
  const [projectionReady, setProjectionReady] = useState(false);

  useEffect(() => {
    const socket = connectSocket();

    let timeoutId = null;

    const applySensorStatus = (payload) => {
      const spotId = Number(payload?.spotId);
      const sensorStatus = payload?.status;

      if (
        payload?.source !== "sensor" ||
        !Number.isFinite(spotId) ||
        !["occupied", "free"].includes(sensorStatus)
      ) {
        return false;
      }

      setLevels((prev) =>
        prev.map((lvl) => ({
          ...lvl,
          spots: lvl.spots.map((spot) =>
            Number(spot.spotId) === spotId
              ? {
                  ...spot,
                  status: sensorStatus === "occupied" ? "blocked" : "free",
                  reason:
                    sensorStatus === "occupied"
                      ? "sensor_reports_occupied"
                      : null,
                  extensionBlocked: sensorStatus === "occupied",
                }
              : spot,
          ),
        })),
      );

      setProjectionReady(true);
      return true;
    };

    const handler = (payload) => {
      if (!start || !end) return;

      if (applySensorStatus(payload)) {
        return;
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        setRefreshTick((prev) => prev + 1);
      }, 250);
    };

    const off = onEvent("parking.projection.changed", handler);
    const offDashboard = onEvent("dashboard.changed", handler);
    socket.on("connect", handler);
    socket.on("reconnect", handler);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      off?.();
      offDashboard?.();
      socket.off("connect", handler);
      socket.off("reconnect", handler);
      disconnectSocket();
    };
  }, [start, end]);

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
      try {
        const spots = await apiGet("/parking/spots");

        const grouped = Array.from({ length: LEVELS }, (_, i) => ({
          id: i,
          spots: [],
        }));

        for (const s of spots) {
          const levelIndex = (s.levelId ?? 1) - 1;
          if (!grouped[levelIndex]) continue;

          const spotWidth = Number(s.w ?? 0);
          const mirroredX = FLOOR_W - Number(s.x) - spotWidth;

          grouped[levelIndex].spots.push({
            ...s,
            x: mirroredX,
            id: s.code,
            spotId: s.spotId,
            status: s.status ?? "free",
          });
        }

        setLevels(grouped);
      } catch (err) {
        console.error("[PARKING] Eroare la /parking/spots:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hasSpots) return;

    let cancelled = false;
    const requestId = ++projectionRequestRef.current;

    const startDate = isLiveMode ? new Date() : start;
    const endDate = isLiveMode ? new Date(Date.now() + 60 * 60 * 1000) : end;

    const projectionMode =
      mode === "subscription" ? "subscription" : "reservation";

    (async () => {
      try {
        const projection = await apiPost("/parking/projection", {
          mode: projectionMode,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          subscriptionPlan,
          extendMinutes: 60,
          excludeReservationId,
        });

        if (cancelled || projectionRequestRef.current !== requestId) return;

        const bySpotId = new Map(projection.map((p) => [p.spotId, p]));

        setLevels((prev) =>
          prev.map((lvl) => ({
            ...lvl,
            spots: lvl.spots.map((s) => ({
              ...s,
              status: bySpotId.get(s.spotId)?.status ?? "free",
              reason: bySpotId.get(s.spotId)?.reason ?? null,
              extensionBlocked:
                bySpotId.get(s.spotId)?.extensionBlocked ?? false,
            })),
          })),
        );

        setProjectionReady(true);
      } catch (e) {
        if (!cancelled) {
          console.error("[PARKING] projection fetch failed", e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hasSpots,
    mode,
    subscriptionPlan,
    start,
    end,
    isLiveMode,
    refreshTick,
    canSelectSpots,
    excludeReservationId,
  ]);

  useEffect(() => {
    if (!selected) return;

    const level = levels.find((lvl) => lvl.id === selected.level);
    const spot = level?.spots.find((s) => s.id === selected.code);
    const exists = !!spot;
    const isStillSelectable =
      spot?.status === "free" || spot?.status === "limited";

    if (!exists || !isStillSelectable || !canSelectSpots) {
      setSelected(null);
    }
  }, [selected, levels, canSelectSpots]);

  useEffect(() => {
    const fingerprint = selected
      ? `${selected.level}|${selected.code}|${selected.spotId}`
      : "__NONE__";

    // La prima randare nu trimitem clear automat.
    if (lastSelectionFingerprintRef.current === null && !selected) {
      lastSelectionFingerprintRef.current = fingerprint;
      return;
    }

    if (lastSelectionFingerprintRef.current === fingerprint) {
      return;
    }

    lastSelectionFingerprintRef.current = fingerprint;

    let payload;

    if (!selected) {
      payload = { type: "spot_cleared" };
    } else {
      const level = levels.find((lvl) => lvl.id === selected.level);
      const spot = level?.spots.find((s) => s.id === selected.code);
      if (!spot) return;

      payload = {
        type: "spot_selected",
        code: spot.id,
        spotId: spot.spotId,
        level: selected.level,
        status: spot.status,
        extensionBlocked: spot.status === "limited",
        mode,
        subscriptionPlan,
        start: (isLiveMode ? new Date() : start).toISOString(),
        end: (isLiveMode
          ? new Date(Date.now() + 60 * 60 * 1000)
          : end
        ).toISOString(),
      };
    }

    try {
      if (window.ReactNativeWebView?.postMessage) {
        // Trimite status, extensionBlocked, spotId, level corect
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            ...payload,
            status: payload.status,
            extensionBlocked: payload.extensionBlocked,
            spotId: payload.spotId,
            level: payload.level,
          }),
        );
      }
    } catch (e) {
      console.error("postMessage failed", e);
    }
  }, [
    selected,
    levels,
    start,
    end,
    isLiveMode,
    mode,
    subscriptionPlan,
    excludeReservationId,
  ]);

  useEffect(() => {
    if (!canSelectSpots || !projectionReady) return;

    let disposed = false;

    const syncSelectedFromServer = async () => {
      try {
        const resp = await apiGet("/parking/selected-spot");
        if (disposed) return;

        const next = resp?.selected ?? null;
        const normalized = next
          ? {
              level: Number(next.level),
              code: String(next.code),
              spotId: Number(next.spotId),
            }
          : null;

        setSelected((prev) => {
          const same =
            !!prev === !!normalized &&
            (!prev ||
              (prev.level === normalized.level &&
                prev.code === normalized.code &&
                prev.spotId === normalized.spotId));

          if (same) return prev;

          const localSelectionIsFresh =
            !!prev && Date.now() - lastLocalSelectionAtRef.current < 4000;
          if (localSelectionIsFresh) return prev;

          return normalized;
        });
      } catch {
        // ignoră erori tranzitorii
      }
    };

    // doar o sincronizare la intrare, nu polling continuu
    syncSelectedFromServer();

    return () => {
      disposed = true;
    };
  }, [canSelectSpots, projectionReady]);

  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type !== "parking.availability.updated") return;

      const availability = Array.isArray(event.data.availability)
        ? event.data.availability
        : [];
      const bySpotId = new Map(
        availability.map((item) => [Number(item.spotId ?? item.id), item]),
      );

      setLevels((prev) =>
        prev.map((lvl) => ({
          ...lvl,
          spots: lvl.spots.map((spot) => {
            const next = bySpotId.get(Number(spot.spotId));
            if (!next) return spot;

            return {
              ...spot,
              status: next.status ?? "free",
              reason: next.reason ?? null,
              extensionBlocked: next.extensionBlocked ?? false,
            };
          }),
        })),
      );

      setProjectionReady(true);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const visibleLevel = canSelectSpots
    ? (selected?.level ?? activeLevel)
    : activeLevel;
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#ffffff" }}>
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
        onClear={() => {
          lastLocalSelectionAtRef.current = Date.now();
          setSelected(null);
        }}
      />

      <Canvas
        camera={{ position: [FLOOR_W * 0.55, 22, FLOOR_H * 1.8], fov: 50 }}
        style={{ background: "#ffffff" }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#ffffff"]} />
          <hemisphereLight args={["#ffffff", "#9ca3af", 0.35]} />
          <directionalLight position={[60, 60, 20]} intensity={0.7} />
          <pointLight
            position={[FLOOR_W * 0.5, 4, FLOOR_H * 0.5]}
            intensity={0.2}
            distance={70}
          />

          {levels.map((lvl, idx) => {
            const y = idx * FLOOR_CLEAR;

            const isolateTargetLevel = canSelectSpots
              ? visibleLevel
              : activeLevel;
            const visible = isolate ? idx === isolateTargetLevel : true;

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
                  lastLocalSelectionAtRef.current = Date.now();
                  if (nextSelected?.level != null) {
                    setActiveLevel(nextSelected.level);
                  }
                  setSelected(nextSelected);
                }}
              />
            );
          })}

          <OrbitControls makeDefault />
        </Suspense>
      </Canvas>
    </div>
  );
}

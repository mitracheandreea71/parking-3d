import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Edges, Text } from "@react-three/drei";

import UiOverlay from "./components/UiOverlay";
import ParkingLevel from "./components/ParkingLevel";
import { CurvedLinkRamp } from "./components/Ramp";
import { LEVELS, FLOOR_W, FLOOR_H, FLOOR_CLEAR, SLAB_T } from "./config";
import { makeSpots } from "./data/makeSpots";
export default function App() {
  const [levels, setLevels] = useState(
    Array.from({ length: LEVELS }, (_, i) => ({ id: i, spots: makeSpots() }))
  );
  const [activeLevel, setActiveLevel] = useState(0);
  const [isolate, setIsolate] = useState(false);
  const [selected, setSelected] = useState(null); // {level,id}

  const toggleStatus = (levelId, spotId) => {
    setLevels((prev) =>
      prev.map((lvl) =>
        lvl.id !== levelId
          ? lvl
          : {
              ...lvl,
              spots: lvl.spots.map((s) =>
                s.id === spotId
                  ? {
                      ...s,
                      status:
                        s.status === "free"
                          ? "reserved"
                          : s.status === "reserved"
                          ? "occupied"
                          : "free",
                    }
                  : s
              ),
            }
      )
    );
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
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

        {/* Nivele */}
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
              setSelected={(id) => setSelected({ level: idx, id })}
              onToggle={(id) => toggleStatus(idx, id)}
            />
          );
        })}

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}

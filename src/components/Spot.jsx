import React, { useMemo, useRef } from "react";
import { Edges, Html } from "@react-three/drei";
import { colorForStatus, SELECT_FILL } from "../config";

export default function Spot({
  levelY,
  spot,
  isSelected,
  onSelect,
  opacity = 1,
  selectable = false,
}) {
  const lastTapRef = useRef(0);

  const pos = useMemo(
    () => [spot.x + spot.w / 2, levelY + 0.01, spot.y + spot.h / 2],
    [spot.x, spot.w, levelY, spot.y, spot.h],
  );

  // Albastru apare doar pentru locul selectat; restul locurilor rămân pe culoarea implicită.
  const canRenderSelected = isSelected && String(spot.status) === "free";
  const fillColor = canRenderSelected
    ? SELECT_FILL
    : colorForStatus(spot.status);

  const handleSelect = (e) => {
    if (!selectable || !onSelect) return;

    e.stopPropagation();

    // Evită multi-click-uri rapide (250ms debounce)
    const now = Date.now();
    if (now - lastTapRef.current < 250) return;
    lastTapRef.current = now;

    onSelect();
  };

  return (
    <group>
      <mesh position={pos} onClick={selectable ? handleSelect : undefined}>
        <boxGeometry args={[spot.w, 0.02, spot.h]} />
        <meshStandardMaterial
          color={fillColor}
          emissive={fillColor}
          emissiveIntensity={canRenderSelected ? 0.35 : 0}
          transparent
          opacity={opacity}
          metalness={0.1}
          roughness={0.75}
        />
        <Edges color="#0f172a" />
      </mesh>

      <Html
        position={[pos[0], levelY + 0.06, pos[2]]}
        center
        distanceFactor={18}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          fontSize: "10px",
          fontWeight: 700,
          color: "#0f172a",
          textShadow: "0 1px 2px rgba(255,255,255,0.8)",
        }}
      >
        {spot.code}
      </Html>
    </group>
  );
}

import { useMemo } from "react";
import { Html, Edges } from "@react-three/drei";
import { LINE, SELECT_FILL, colorForStatus } from "../config";

export default function Spot({
  levelY,
  spot,
  isSelected,
  onSelect,
  opacity = 1,
}) {
  const pos = useMemo(
    () => [spot.x + spot.w / 2, levelY + 0.02, spot.y + spot.h / 2],
    [spot.x, spot.y, spot.w, spot.h, levelY]
  );
  const scale = useMemo(() => [spot.w, 0.1, spot.h], [spot.w, spot.h]);
  const labelPos = [pos[0], levelY + 0.24, pos[2]];

  return (
    <group>
      {/* contur alb */}
      <MarkingRect
        position={[pos[0], levelY + 0.005, pos[2]]}
        w={spot.w}
        h={spot.h}
      />

      {/* dala colorată după status (din backend) */}
      <mesh position={pos} scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={colorForStatus(spot.status)}
          roughness={0.75}
          metalness={0.1}
          transparent
          opacity={0.9 * opacity}
        />
      </mesh>

      {/* selecție */}
      {isSelected && (
        <group>
          <mesh position={[pos[0], levelY + 0.015, pos[2]]}>
            <boxGeometry args={[spot.w - 0.05, 0.01, spot.h - 0.05]} />
            <meshStandardMaterial
              color={SELECT_FILL}
              transparent
              opacity={0.35}
            />
          </mesh>
          <mesh position={pos} scale={[spot.w, 0.02, spot.h]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial transparent opacity={0} />
            <Edges scale={1.001} threshold={15} color={SELECT_FILL} />
          </mesh>
        </group>
      )}

      {/* hitbox pentru click/select */}
      <mesh
        position={[pos[0], levelY + 0.02, pos[2]]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        <boxGeometry args={[spot.w, 0.02, spot.h]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* etichetă */}
      <Html
        position={labelPos}
        center
        distanceFactor={12}
        style={{
          background: "rgba(0,0,0,0.65)",
          color: "white",
          padding: "2px 4px",
          borderRadius: 4,
          fontSize: 11,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {spot.id}
      </Html>
    </group>
  );
}

function MarkingRect({ position, w, h }) {
  const t = 0.06;
  return (
    <group>
      <mesh position={[position[0], position[1], position[2] - h / 2 + t / 2]}>
        <boxGeometry args={[w, 0.005, t]} />
        <meshStandardMaterial color={LINE} />
      </mesh>
      <mesh position={[position[0], position[1], position[2] + h / 2 - t / 2]}>
        <boxGeometry args={[w, 0.005, t]} />
        <meshStandardMaterial color={LINE} />
      </mesh>
      <mesh position={[position[0] - w / 2 + t / 2, position[1], position[2]]}>
        <boxGeometry args={[t, 0.005, h]} />
        <meshStandardMaterial color={LINE} />
      </mesh>
      <mesh position={[position[0] + w / 2 - t / 2, position[1], position[2]]}>
        <boxGeometry args={[t, 0.005, h]} />
        <meshStandardMaterial color={LINE} />
      </mesh>
    </group>
  );
}

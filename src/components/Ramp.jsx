// components/Ramp.jsx
import * as THREE from "three";
import { SLAB_T, FLOOR_CLEAR, ASPHALT, FLOOR_W, FLOOR_H } from "../config";
import { useMemo } from "react";

function DashedLineOnRamp({
  length,
  dashLength = 1.0,
  gapLength = 0.8,
  width = 0.15,
  color = "white",
}) {
  const parts = useMemo(() => {
    const total = length;
    const segmentLen = dashLength + gapLength;
    const count = Math.floor(total / segmentLen);
    const meshes = [];

    for (let i = 0; i < count; i++) {
      const x0 = -length / 2 + i * segmentLen + dashLength / 2;
      meshes.push(
        <mesh key={i} position={[x0, 0.006, 0]}>
          <boxGeometry args={[dashLength, 0.01, width]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    }
    return meshes;
  }, [length, dashLength, gapLength, width, color]);

  return <group>{parts}</group>;
}

export default function Ramp({
  axis = "x",
  dir = +1,
  y = 0,
  start = [2, 2],
  length = 12,
  width = 3.4,
  rise = FLOOR_CLEAR - SLAB_T,
  curb = 0.08,
  color = ASPHALT,
  showCenterLine = true,
}) {
  const angle = Math.atan2(rise, length);

  // Centrul geometric al rampei
  const center =
    axis === "x"
      ? [start[0] + (dir * length) / 2, y + rise / 2, start[1]]
      : [start[0], y + rise / 2, start[1] + (dir * length) / 2];

  // Înclinare
  const rotation = axis === "x" ? [0, 0, -dir * angle] : [-dir * angle, 0, 0];

  // Borduri laterale (opționale)
  const curbOffsets =
    axis === "x"
      ? [
          [0, 0, +width / 2 - curb / 2],
          [0, 0, -width / 2 + curb / 2],
        ]
      : [
          [+width / 2 - curb / 2, 0, 0],
          [-width / 2 + curb / 2, 0, 0],
        ];

  return (
    <group>
      {/* Rampa principală */}
      <mesh position={center} rotation={rotation} castShadow receiveShadow>
        {axis === "x" ? (
          <boxGeometry args={[length, SLAB_T, width]} />
        ) : (
          <boxGeometry args={[width, SLAB_T, length]} />
        )}
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>

      {/* Bordurile laterale */}
      {curbOffsets.map((off, i) => (
        <mesh
          key={i}
          position={[
            center[0] + off[0],
            center[1] + SLAB_T / 2 + curb / 2,
            center[2] + off[2],
          ]}
          rotation={rotation}
        >
          {axis === "x" ? (
            <boxGeometry args={[length, curb, curb]} />
          ) : (
            <boxGeometry args={[curb, curb, length]} />
          )}
          <meshStandardMaterial color="#999" />
        </mesh>
      ))}

      {/* Linia punctată centrală (înclinată împreună cu rampa) */}
      {showCenterLine && (
        <group
          position={[
            center[0],
            center[1] + 0.15, // 👈 ridicăm puțin deasupra rampei
            center[2],
          ]}
          rotation={rotation}
        >
          <DashedLineOnRamp
            length={length}
            dashLength={1.0}
            gapLength={0.8}
            width={0.12}
            color="white"
          />
        </group>
      )}
    </group>
  );
}

/**
 * CurvedLinkRamp — rampă CURBATĂ (rotunjită) care leagă 2 niveluri.
 * (rămâne neschimbată)
 */
export function CurvedLinkRamp({
  fromLevel = 2,
  toLevel = 1,
  width = 3.6,
  slabT = SLAB_T,
  color = ASPHALT,

  enterX = 1.4,
  enterZ = FLOOR_H * 0.18,
  midX = 6.0,
  midZ = FLOOR_H * 0.4,
  endX = FLOOR_W * 0.5,
  endZ = FLOOR_H * 0.5,

  samples = 80,
}) {
  const rise = (toLevel - fromLevel) * (FLOOR_CLEAR - SLAB_T);
  const yTop = fromLevel * FLOOR_CLEAR;
  const yBot = toLevel * FLOOR_CLEAR;

  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const omt = 1 - t;
    const x = omt * omt * enterX + 2 * omt * t * midX + t * t * endX;
    const z = omt * omt * enterZ + 2 * omt * t * midZ + t * t * endZ;
    const y = yTop + (yBot - yTop) * t + slabT;
    pts.push(new THREE.Vector3(x, y, z));
  }

  const tailLen = 2.5;
  const last = pts[pts.length - 1];
  const before = pts[pts.length - 2];
  const dir = new THREE.Vector3().subVectors(last, before).normalize();
  for (let i = 1; i <= 8; i++) {
    const s = (tailLen * i) / 8;
    pts.push(
      new THREE.Vector3(
        last.x + dir.x * s,
        last.y + dir.y * s,
        last.z + dir.z * s
      )
    );
  }

  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -slabT / 2);
  shape.lineTo(width / 2, -slabT / 2);
  shape.lineTo(width / 2, slabT / 2);
  shape.lineTo(-width / 2, slabT / 2);
  shape.closePath();

  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.06);
  const geom = new THREE.ExtrudeGeometry(shape, {
    steps: pts.length,
    bevelEnabled: false,
    extrudePath: curve,
  });
  geom.computeVertexNormals();

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

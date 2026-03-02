import * as THREE from "three";
import { useMemo } from "react";
import { SLAB_T, FLOOR_W, FLOOR_H, ASPHALT } from "../config";

export default function FloorWithVoid({ y = 0, voidRect = null }) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    // contur complet
    shape.moveTo(-FLOOR_W / 2, -FLOOR_H / 2);
    shape.lineTo(FLOOR_W / 2, -FLOOR_H / 2);
    shape.lineTo(FLOOR_W / 2, FLOOR_H / 2);
    shape.lineTo(-FLOOR_W / 2, FLOOR_H / 2);
    shape.lineTo(-FLOOR_W / 2, -FLOOR_H / 2);

    // adăugăm golul doar dacă e definit
    if (voidRect) {
      const { x, z, w, h } = voidRect;
      const hole = new THREE.Path();
      hole.moveTo(x - w / 2, z - h / 2);
      hole.lineTo(x + w / 2, z - h / 2);
      hole.lineTo(x + w / 2, z + h / 2);
      hole.lineTo(x - w / 2, z + h / 2);
      hole.lineTo(x - w / 2, z - h / 2);
      shape.holes.push(hole);
    }

    return new THREE.ExtrudeGeometry(shape, {
      depth: SLAB_T,
      bevelEnabled: false,
    });
  }, [voidRect]);

  return (
    <mesh
      geometry={geom}
      receiveShadow
      rotation-x={-Math.PI / 2}
      position={[FLOOR_W / 2, y, FLOOR_H / 2]}
    >
      <meshStandardMaterial color={ASPHALT} roughness={0.8} />
    </mesh>
  );
}

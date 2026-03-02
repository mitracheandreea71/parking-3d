import * as THREE from "three";
import { FLOOR_W, FLOOR_H, FLOOR_CLEAR, SLAB_T, CONCRETE } from "../config";

export default function PerimeterWalls({
  level = 0,
  height = FLOOR_CLEAR,
  thickness = 0.25,
  openingSide = "S",
  openingWidth = 4,
  openingCenter = FLOOR_W / 2,
  opacity = 1,
}) {
  const y = level * FLOOR_CLEAR + SLAB_T / 2;
  const halfW = FLOOR_W / 2;
  const halfH = FLOOR_H / 2;

  const mat = (
    <meshStandardMaterial
      color={CONCRETE}
      transparent={opacity < 1}
      opacity={opacity}
      roughness={0.9}
      metalness={0.0}
    />
  );

  function slicedSegments(total, openingStart, openingEnd) {
    const segs = [];
    if (openingStart > 0.001) segs.push([openingStart / 2, openingStart]); // segment stânga
    if (total - openingEnd > 0.001) {
      const len = total - openingEnd;
      segs.push([openingEnd + len / 2, len]); // segment dreapta
    }
    return segs;
  }

  const opening = THREE.MathUtils.clamp(
    openingWidth,
    0,
    openingSide === "N" || openingSide === "S" ? FLOOR_W : FLOOR_H
  );
  const oc = openingCenter;
  const oStart = oc - opening / 2;
  const oEnd = oc + opening / 2;

  const walls = [];

  // Sud (z = -halfH)
  if (openingSide === "S") {
    for (const [cx, len] of slicedSegments(FLOOR_W, oStart, oEnd)) {
      walls.push(
        <mesh
          key={`S-${cx}`}
          position={[cx - FLOOR_W / 2, y + height / 2, -halfH]}
        >
          <boxGeometry args={[len, height, thickness]} />
          {mat}
        </mesh>
      );
    }
  } else {
    walls.push(
      <mesh key="S" position={[0, y + height / 2, -halfH]}>
        <boxGeometry args={[FLOOR_W, height, thickness]} />
        {mat}
      </mesh>
    );
  }

  // Nord (z = +halfH)
  if (openingSide === "N") {
    for (const [cx, len] of slicedSegments(FLOOR_W, oStart, oEnd)) {
      walls.push(
        <mesh
          key={`N-${cx}`}
          position={[cx - FLOOR_W / 2, y + height / 2, halfH]}
        >
          <boxGeometry args={[len, height, thickness]} />
          {mat}
        </mesh>
      );
    }
  } else {
    walls.push(
      <mesh key="N" position={[0, y + height / 2, halfH]}>
        <boxGeometry args={[FLOOR_W, height, thickness]} />
        {mat}
      </mesh>
    );
  }

  // Vest (x = -halfW)
  if (openingSide === "W") {
    for (const [cz, len] of slicedSegments(FLOOR_H, oStart, oEnd)) {
      walls.push(
        <mesh
          key={`W-${cz}`}
          position={[-halfW, y + height / 2, cz - FLOOR_H / 2]}
        >
          <boxGeometry args={[thickness, height, len]} />
          {mat}
        </mesh>
      );
    }
  } else {
    walls.push(
      <mesh key="W" position={[-halfW, y + height / 2, 0]}>
        <boxGeometry args={[thickness, height, FLOOR_H]} />
        {mat}
      </mesh>
    );
  }

  // Est (x = +halfW)
  if (openingSide === "E") {
    for (const [cz, len] of slicedSegments(FLOOR_H, oStart, oEnd)) {
      walls.push(
        <mesh
          key={`E-${cz}`}
          position={[halfW, y + height / 2, cz - FLOOR_H / 2]}
        >
          <boxGeometry args={[thickness, height, len]} />
          {mat}
        </mesh>
      );
    }
  } else {
    walls.push(
      <mesh key="E" position={[halfW, y + height / 2, 0]}>
        <boxGeometry args={[thickness, height, FLOOR_H]} />
        {mat}
      </mesh>
    );
  }

  return <group>{walls}</group>;
}

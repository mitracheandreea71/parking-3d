import { Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import Spot from "./Spot";
import EntranceGate from "./EntranceGate";
import Ramp from "./Ramp";
import {
  FLOOR_W,
  FLOOR_H,
  SLAB_T,
  FLOOR_CLEAR,
  ASPHALT,
  CONCRETE,
} from "../config";

function ExteriorWalls({
  y,
  opacity,
  texture,
  openingSide = null,
  openingWidth = 0,
  openingCenter = 0,
}) {
  if (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(FLOOR_W / 5, FLOOR_CLEAR / 5);
  }
  const wallHeight = FLOOR_CLEAR - SLAB_T;
  const wallThickness = 0.5;

  const mat = (
    <meshStandardMaterial
      map={texture}
      transparent={opacity < 1}
      opacity={opacity}
      color={!texture ? "#555" : "#fff"}
    />
  );

  const BackWallSegment = ({ xCenter, len }) => (
    <mesh
      castShadow
      receiveShadow
      position={[xCenter, y + wallHeight / 2, wallThickness / 2]}
    >
      <boxGeometry args={[len, wallHeight, wallThickness]} />
      {mat}
    </mesh>
  );

  const RightWallSegment = ({ zCenter, len }) => (
    <mesh
      castShadow
      receiveShadow
      position={[FLOOR_W - wallThickness / 2, y + wallHeight / 2, zCenter]}
    >
      <boxGeometry args={[wallThickness, wallHeight, len]} />
      {mat}
    </mesh>
  );

  return (
    <group>
      {openingSide === "back" && openingWidth > 0 ? (
        (() => {
          const half = openingWidth / 2;
          const start = Math.max(0, openingCenter - half);
          const end = Math.min(FLOOR_W, openingCenter + half);
          const L = start;
          const R = FLOOR_W - end;
          return (
            <group>
              {L > 0.01 && <BackWallSegment xCenter={L / 2} len={L} />}
              {R > 0.01 && <BackWallSegment xCenter={end + R / 2} len={R} />}
            </group>
          );
        })()
      ) : (
        <mesh
          castShadow
          receiveShadow
          position={[FLOOR_W / 2, y + wallHeight / 2, wallThickness / 2]}
        >
          <boxGeometry args={[FLOOR_W, wallHeight, wallThickness]} />
          {mat}
        </mesh>
      )}

      <mesh
        castShadow
        receiveShadow
        position={[wallThickness / 2, y + wallHeight / 2, FLOOR_H / 2]}
        rotation-y={Math.PI / 2}
      >
        <boxGeometry args={[FLOOR_H, wallHeight, wallThickness]} />
        {mat}
      </mesh>

      {openingSide === "right" && openingWidth > 0 ? (
        (() => {
          const half = openingWidth / 2;
          const start = Math.max(0, openingCenter - half);
          const end = Math.min(FLOOR_H, openingCenter + half);
          const S = start;
          const N = FLOOR_H - end;
          return (
            <group>
              {S > 0.01 && <RightWallSegment zCenter={S / 2} len={S} />}
              {N > 0.01 && <RightWallSegment zCenter={end + N / 2} len={N} />}
            </group>
          );
        })()
      ) : (
        <mesh
          castShadow
          receiveShadow
          position={[
            FLOOR_W - wallThickness / 2,
            y + wallHeight / 2,
            FLOOR_H / 2,
          ]}
          rotation-y={-Math.PI / 2}
        >
          <boxGeometry args={[FLOOR_H, wallHeight, wallThickness]} />
          {mat}
        </mesh>
      )}
    </group>
  );
}

function spotNumberLabel(spotId) {
  // pentru "L1", "R12" -> "1", "12"
  // dacă nu e formatul ăsta, arată tot id-ul
  if (typeof spotId !== "string") return String(spotId);
  const m = spotId.match(/\d+/);
  return m ? m[0] : spotId;
}

function ParkingSpotNumbers({ y, spots }) {
  return (
    <group>
      {spots.map((spot) => {
        const isTopRow = spot.y < FLOOR_H / 2;
        const position = [
          spot.x + spot.w / 2,
          y + FLOOR_CLEAR / 2,
          isTopRow ? 0.4 : FLOOR_H - 0.4,
        ];
        return (
          <Text
            key={`num-${spot.id}`}
            position={position}
            rotation-y={isTopRow ? 0 : Math.PI}
            fontSize={1.5}
            color="white"
            anchorX="center"
          >
            {spotNumberLabel(spot.id)}
          </Text>
        );
      })}
    </group>
  );
}

function TrafficArrows({ y, texture }) {
  const arrowPositionsX = [10, 35];
  return (
    <group>
      {arrowPositionsX.map((x) =>
        [FLOOR_H / 2 - 2.5, FLOOR_H / 2 - 5.0].map((z, i) => (
          <mesh
            key={`arrow-top-${x}-${i}`}
            position={[x, y, z]}
            rotation-x={-Math.PI / 2}
            rotation-z={Math.PI / 2}
          >
            <planeGeometry args={[2, 2]} />
            <meshStandardMaterial map={texture} transparent alphaTest={0.5} />
          </mesh>
        )),
      )}
      {arrowPositionsX.map((x) =>
        [FLOOR_H / 2 + 2.5, FLOOR_H / 2 + 5.0].map((z, i) => (
          <mesh
            key={`arrow-bottom-${x}-${i}`}
            position={[x, y, z]}
            rotation-x={-Math.PI / 2}
            rotation-z={-Math.PI / 2}
          >
            <planeGeometry args={[2, 2]} />
            <meshStandardMaterial map={texture} transparent alphaTest={0.5} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Columns({
  y,
  opacity,
  hazardTexture,
  spots = [],
  spacing = 9.6,
  offset = 3,
  size = 0.5,
  baseExtra = 0.12,
  aisleBuffer = 0.9,
}) {
  const COL_SIZE = size;
  const BASE_SIZE = size + baseExtra;
  const EDGE_MARGIN = COL_SIZE / 2 + 0.4;
  const topRow = spots
    .filter((s) => s.y < FLOOR_H / 2)
    .sort((a, b) => a.x - b.x);
  const botRow = spots
    .filter((s) => s.y >= FLOOR_H / 2)
    .sort((a, b) => a.x - b.x);
  const topEdge = topRow.length
    ? Math.max(...topRow.map((s) => s.y + s.h))
    : FLOOR_H / 2 - 3;
  const botEdge = botRow.length
    ? Math.min(...botRow.map((s) => s.y))
    : FLOOR_H / 2 + 3;
  const zTop = topEdge + aisleBuffer + COL_SIZE / 2;
  const zBot = botEdge - aisleBuffer - COL_SIZE / 2;
  const left = Math.max(EDGE_MARGIN, 7);
  const right = Math.min(FLOOR_W - EDGE_MARGIN, FLOOR_W - 7);
  const firstX = left + (((offset % spacing) + spacing) % spacing);
  const gridXs = [];
  for (let x = firstX; x <= right; x += spacing) gridXs.push(x);
  const marginX = COL_SIZE / 2 + 0.25;
  const spansTop = topRow.map((s) => [s.x - marginX, s.x + s.w + marginX]);
  const spansBot = botRow.map((s) => [s.x - marginX, s.x + s.w + marginX]);
  const isForbidden = (x, spans) => spans.some(([a, b]) => x >= a && x <= b);
  const snapToFree = (x, spans) => {
    if (!isForbidden(x, spans)) return x;
    const MAX_STEPS = 3;
    for (let step = 1; step <= MAX_STEPS; step++) {
      const L = x - step * spacing;
      const R = x + step * spacing;
      if (L >= left && !isForbidden(L, spans)) return L;
      if (R <= right && !isForbidden(R, spans)) return R;
    }
    return THREE.MathUtils.clamp(x, left, right);
  };
  const xsTop = gridXs.map((x) => snapToFree(x, spansTop));
  const xsBot = gridXs.map((x) => snapToFree(x, spansBot));
  const h = FLOOR_CLEAR - SLAB_T;
  const baseHeight = 1.2;
  const Pillar = ({ pos }) => (
    <group position={pos}>
      <mesh
        castShadow
        receiveShadow
        position-y={baseHeight + (h - baseHeight) / 2}
      >
        <boxGeometry args={[COL_SIZE, h - baseHeight, COL_SIZE]} />
        <meshStandardMaterial
          color={CONCRETE}
          roughness={0.9}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      <mesh castShadow receiveShadow position-y={baseHeight / 2}>
        <boxGeometry args={[BASE_SIZE, baseHeight, BASE_SIZE]} />
        <meshStandardMaterial
          map={hazardTexture}
          color={!hazardTexture ? "yellow" : "white"}
        />
      </mesh>
    </group>
  );
  return (
    <group>
      {xsTop.map((x, i) => (
        <Pillar key={`t-${i}`} pos={[x, y, zTop]} />
      ))}
      {xsBot.map((x, i) => (
        <Pillar key={`b-${i}`} pos={[x, y, zBot]} />
      ))}
    </group>
  );
}

function DashedLine({
  y,
  z,
  xStart,
  xEnd,
  dashLength = 1.0,
  gapLength = 0.6,
  width = 0.08,
  color = "white",
}) {
  const parts = [];
  const total = xEnd - xStart;
  const segmentLen = dashLength + gapLength;
  const count = Math.floor(total / segmentLen);
  for (let i = 0; i < count; i++) {
    const x0 = xStart + i * segmentLen;
    const centerX = x0 + dashLength / 2;
    parts.push(
      <mesh key={i} position={[centerX, y, z]}>
        <boxGeometry args={[dashLength, 0.01, width]} />
        <meshStandardMaterial color={color} />
      </mesh>,
    );
  }
  return <group>{parts}</group>;
}

function LaneMarkings({ y }) {
  const xStart = 0;
  const xEnd = FLOOR_W;
  const laneWidth = 1.5;
  const topCenter = FLOOR_H / 2 - 3;
  const bottomCenter = FLOOR_H / 2 + 3;
  const rampStartX = FLOOR_W - 25;
  const rampLength = 12;
  const rampEndX = rampStartX + rampLength;

  const makeLine = (z) => (
    <>
      <DashedLine y={y} z={z} xStart={xStart} xEnd={rampStartX - 0.3} />
      <DashedLine y={y} z={z} xStart={rampEndX + 0.3} xEnd={xEnd} />
    </>
  );

  return (
    <group>
      {makeLine(topCenter - 0.73)}
      {makeLine(bottomCenter + laneWidth - 0.73)}
      {makeLine(FLOOR_H / 2 - 0.15)}
      {makeLine(FLOOR_H / 2 + 0.15)}
    </group>
  );
}

export default function ParkingLevel({
  index,
  y,
  spots,
  visible,
  dim,
  canSelectSpots,
  selected,
  setSelected,
}) {
  if (!visible) return null;
  const opacity = dim ? 0.7 : 1;

  const [wallTexture, hazardTexture, arrowTexture] = useTexture([
    "/textures/concrete_wall.jpg",
    "/textures/hazard_stripes.jpg",
    "/textures/arrow.jpg",
  ]);

  const RIGHT_OPENING_WIDTH = 12;
  const RIGHT_OPENING_CENTER = FLOOR_H / 2;
  const APRON_LEN = 7;
  const APRON_EXTRA_Z = 2;
  const GATE_OFFSET_X = 2.0;
  const LANE_HALF_GAP = 3.0;

  const RAMP_START_X = FLOOR_W - 25;
  const RAMP_LENGTH = 12;
  const RAMP_WIDTH = 7.2;
  const RAMP_RISE = FLOOR_CLEAR - SLAB_T;
  const RAMP_CENTER_Z = FLOOR_H / 2;
  const RAMP_MIN_Z = RAMP_CENTER_Z - RAMP_WIDTH / 2;
  const RAMP_MAX_Z = RAMP_CENTER_Z + RAMP_WIDTH / 2;

  const renderFloor = () => {
    if (index === 0) {
      return (
        <mesh receiveShadow position={[FLOOR_W / 2, y, FLOOR_H / 2]}>
          <boxGeometry args={[FLOOR_W, SLAB_T, FLOOR_H]} />
          <meshStandardMaterial color={ASPHALT} roughness={0.8} />
        </mesh>
      );
    }

    return (
      <group>
        <mesh receiveShadow position={[RAMP_START_X / 2, y, FLOOR_H / 2]}>
          <boxGeometry args={[RAMP_START_X, SLAB_T, FLOOR_H]} />
          <meshStandardMaterial color={ASPHALT} roughness={0.8} />
        </mesh>

        {RAMP_START_X + RAMP_LENGTH < FLOOR_W && (
          <mesh
            receiveShadow
            position={[
              RAMP_START_X +
                RAMP_LENGTH +
                (FLOOR_W - (RAMP_START_X + RAMP_LENGTH)) / 2,
              y,
              FLOOR_H / 2,
            ]}
          >
            <boxGeometry
              args={[FLOOR_W - (RAMP_START_X + RAMP_LENGTH), SLAB_T, FLOOR_H]}
            />
            <meshStandardMaterial color={ASPHALT} roughness={0.8} />
          </mesh>
        )}

        <mesh
          receiveShadow
          position={[RAMP_START_X + RAMP_LENGTH / 2, y, RAMP_MIN_Z / 2]}
        >
          <boxGeometry args={[RAMP_LENGTH, SLAB_T, RAMP_MIN_Z]} />
          <meshStandardMaterial color={ASPHALT} roughness={0.8} />
        </mesh>

        <mesh
          receiveShadow
          position={[
            RAMP_START_X + RAMP_LENGTH / 2,
            y,
            RAMP_MAX_Z + (FLOOR_H - RAMP_MAX_Z) / 2,
          ]}
        >
          <boxGeometry args={[RAMP_LENGTH, SLAB_T, FLOOR_H - RAMP_MAX_Z]} />
          <meshStandardMaterial color={ASPHALT} roughness={0.8} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {renderFloor()}

      {index > 1 && (
        <mesh position={[FLOOR_W / 2, y + FLOOR_CLEAR, FLOOR_H / 2]}>
          <boxGeometry args={[FLOOR_W, SLAB_T, FLOOR_H]} />
          <meshStandardMaterial color="#333" roughness={0.9} />
        </mesh>
      )}

      <ExteriorWalls
        y={y + SLAB_T}
        opacity={opacity}
        texture={wallTexture}
        openingSide={index === 0 ? "right" : null}
        openingWidth={index === 0 ? RIGHT_OPENING_WIDTH + 2 : 0}
        openingCenter={RIGHT_OPENING_CENTER}
      />

      {index < 2 && (
        <Ramp
          axis="x"
          dir={1}
          y={y + 0.1}
          start={[RAMP_START_X, RAMP_CENTER_Z]}
          length={RAMP_LENGTH}
          width={RAMP_WIDTH}
          rise={RAMP_RISE}
          color={ASPHALT}
          showCenterLine={true}
        />
      )}

      {index === 0 && (
        <group>
          <mesh
            receiveShadow
            position={[FLOOR_W + APRON_LEN / 2, y, RIGHT_OPENING_CENTER]}
          >
            <boxGeometry
              args={[
                APRON_LEN,
                SLAB_T,
                RIGHT_OPENING_WIDTH + APRON_EXTRA_Z * 2,
              ]}
            />
            <meshStandardMaterial color={ASPHALT} roughness={0.8} />
          </mesh>

          <mesh
            position={[
              FLOOR_W + GATE_OFFSET_X - 0.5,
              y + 0.01,
              RIGHT_OPENING_CENTER - LANE_HALF_GAP,
            ]}
          >
            <boxGeometry args={[1.2, 0.01, 0.08]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh
            position={[
              FLOOR_W + GATE_OFFSET_X - 0.5,
              y + 0.01,
              RIGHT_OPENING_CENTER + LANE_HALF_GAP,
            ]}
          >
            <boxGeometry args={[1.2, 0.01, 0.08]} />
            <meshStandardMaterial color="white" />
          </mesh>

          <EntranceGate
            position={[FLOOR_W + 2, y + SLAB_T, RIGHT_OPENING_CENTER - 7.5]}
            yaw={Math.PI * 1.5}
          />
          <EntranceGate
            position={[FLOOR_W + 2, y + SLAB_T, RIGHT_OPENING_CENTER - 3.5]}
            yaw={Math.PI * 1.5}
          />
          <EntranceGate
            position={[FLOOR_W + 2, y + SLAB_T, RIGHT_OPENING_CENTER + 3.5]}
            yaw={Math.PI / 2}
          />
          <EntranceGate
            position={[FLOOR_W + 2, y + SLAB_T, RIGHT_OPENING_CENTER + 7.5]}
            yaw={Math.PI / 2}
          />
        </group>
      )}

      <Columns
        y={y + SLAB_T}
        opacity={opacity}
        hazardTexture={hazardTexture}
        spots={spots}
        spacing={9.6}
        offset={3}
        size={0.5}
        aisleBuffer={0.9}
      />

      <LaneMarkings y={y + SLAB_T / 2 + 0.01} />
      <TrafficArrows y={y + SLAB_T / 2 + 0.1} texture={arrowTexture} />

      {spots.map((s) => {
        const isSelected =
          selected && selected.level === index && selected.id === s.id;
        const canToggleSelection =
          canSelectSpots && s.status === "free" && (!selected || isSelected);

        return (
          <Spot
            key={`${index}-${s.id}`}
            levelY={y + SLAB_T / 2}
            spot={s}
            isSelected={isSelected}
            onSelect={
              canToggleSelection
                ? () => {
                    setSelected(s.id);
                  }
                : undefined
            }
            opacity={opacity}
          />
        );
      })}
    </group>
  );
}

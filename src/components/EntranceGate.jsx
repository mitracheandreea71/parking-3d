import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CONCRETE } from "../config";

export default function EntranceGate({
  position = [2, 0.11, 2],
  yaw = 0, // rotația pe Y (ex. Math.PI/2 pentru 90° spre axul drumului)
  initiallyOpen = false,
  armLength = 3.3, // lungimea brațului (m)
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const armRef = useRef();

  // Ridică brațul în sus (rotație în jurul Z, ca o barieră reală)
  useFrame((_, dt) => {
    if (!armRef.current) return;
    const target = open ? +Math.PI / 2.05 : 0; // ~88° în sus
    armRef.current.rotation.z +=
      (target - armRef.current.rotation.z) * Math.min(1, dt * 6);
  });

  // Geometrie braț
  const half = armLength / 2;
  const barH = 0.12;
  const barW = 0.12;

  // Dungi albe la ~0.6 m
  const stripeSpacing = 0.6;
  const stripeXs = [];
  for (
    let x = -half + stripeSpacing / 2;
    x <= half - stripeSpacing / 2;
    x += stripeSpacing
  ) {
    stripeXs.push(x);
  }

  return (
    <group position={position} rotation-y={yaw}>
      {/* Stâlp */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <meshStandardMaterial color={CONCRETE} />
      </mesh>

      {/* Braț cu balama (pivotul la stâlp) */}
      <group position={[0.15, 1.0, 0]} ref={armRef}>
        {/* brațul principal orientat pe +X; îl plasăm cu centrul la half */}
        <mesh position={[half, 0, 0]}>
          <boxGeometry args={[armLength, barH, barW]} />
          <meshStandardMaterial color="#e11d48" />
        </mesh>

        {/* dungi albe */}
        {stripeXs.map((dx, i) => (
          <mesh key={i} position={[half + dx, 0, 0]}>
            <boxGeometry args={[0.22, barH + 0.01, barW + 0.01]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>

      {/* UI */}
      <Html position={[0, 1.5, 0]} style={{ transform: "translateX(-50%)" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #4b5563",
            background: "#111827",
            color: "white",
            cursor: "pointer",
          }}
        ></button>
      </Html>
    </group>
  );
}

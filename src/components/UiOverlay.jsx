import { useEffect, useState } from "react";

function pad(n) {
  return String(n).padStart(2, "0");
}
function timeAgo(date) {
  if (!date) return null;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return "acum";
  if (secs < 60) return `acum ${secs}s`;
  return `acum ${Math.floor(secs / 60)}min`;
}

export default function UiOverlay({
  activeLevel,
  setActiveLevel,
  isolate,
  setIsolate,
  selected,
  onClear,
  lastUpdated,
  onRefresh,
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 10,
        background: "rgba(10,14,26,0.92)",
        color: "white",
        padding: "12px 14px",
        borderRadius: 12,
        backdropFilter: "blur(6px)",
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        lineHeight: 1.5,
        border: "1px solid #1e293b",
        minWidth: 200,
      }}
    >
      {/* Etaje */}
      <div
        style={{
          fontWeight: 700,
          marginBottom: 6,
          color: "#94a3b8",
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Etaje
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setActiveLevel(i)}
            style={{
              padding: "5px 11px",
              borderRadius: 8,
              border:
                "1px solid " + (activeLevel === i ? "#10b981" : "#1e293b"),
              background: activeLevel === i ? "#10b981" : "#0f172a",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            N{i + 1}
          </button>
        ))}
      </div>

      {/* Izolează */}
      <label
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          cursor: "pointer",
          marginBottom: 10,
        }}
      >
        <input
          type="checkbox"
          checked={isolate}
          onChange={(e) => setIsolate(e.target.checked)}
          style={{ accentColor: "#10b981", width: 14, height: 14 }}
        />
        <span style={{ color: "#94a3b8", fontSize: 12 }}>
          Izolează etajul activ
        </span>
      </label>

      {/* Legendă */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginBottom: 10,
        }}
      >
        {[
          { color: "#10b981", label: "Liber" },
          { color: "#ef4444", label: "Ocupat" },
          { color: "#6b7280", label: "Urmează rezervare" },
        ].map(({ color, label }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#94a3b8", fontSize: 11 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Refresh status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderTop: "1px solid #1e293b",
          paddingTop: 8,
        }}
      >
        <span style={{ color: "#475569", fontSize: 11, flex: 1 }}>
          {lastUpdated ? `Actualizat ${timeAgo(lastUpdated)}` : "Se încarcă..."}
        </span>
        <button
          onClick={onRefresh}
          title="Actualizează acum"
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 6,
            color: "#38bdf8",
            cursor: "pointer",
            padding: "3px 7px",
            fontSize: 13,
          }}
        >
          ⟳
        </button>
      </div>

      {/* Spot selectat */}
      {selected && (
        <div
          style={{
            marginTop: 10,
            borderTop: "1px solid #1e293b",
            paddingTop: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            <b style={{ color: "#e5e7eb" }}>Selectat:</b> Etaj{" "}
            {selected.level + 1} / {selected.id}
          </div>
          <button
            onClick={onClear}
            style={{
              marginTop: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: "#1e293b",
              color: "#94a3b8",
              border: "1px solid #334155",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            ✕ Deselectează
          </button>
        </div>
      )}
    </div>
  );
}

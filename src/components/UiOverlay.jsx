export default function UiOverlay({
  activeLevel,
  setActiveLevel,
  isolate,
  setIsolate,
  selected,
  onClear,
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 10,
        background: "rgba(17,17,17,0.8)",
        color: "white",
        padding: 12,
        borderRadius: 10,
        backdropFilter: "blur(4px)",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        lineHeight: 1.4,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Etaje</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setActiveLevel(i)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #333",
              background: activeLevel === i ? "#10b981" : "#1f2937",
              color: "white",
              cursor: "pointer",
            }}
          >
            Nivel {i + 1}
          </button>
        ))}
      </div>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={isolate}
          onChange={(e) => setIsolate(e.target.checked)}
        />
        Izolează nivelul activ
      </label>

      {selected && (
        <div style={{ marginTop: 10 }}>
          <div>
            <b>Selectat:</b> L{selected.level + 1} / {selected.id}
          </div>
          <button
            onClick={onClear}
            style={{
              marginTop: 6,
              padding: "4px 8px",
              borderRadius: 6,
              background: "#374151",
              color: "white",
              border: "1px solid #4b5563",
              cursor: "pointer",
            }}
          >
            Deselectează
          </button>
        </div>
      )}
    </div>
  );
}

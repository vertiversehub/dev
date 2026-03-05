import { useState } from "react";

const C = {
  bg: "#0d0f14", surface: "#161b24", card: "#1e2534", border: "#2a3347",
  accent: "#f0c060", accentDim: "#a07c30",
};

export function Lobby({ onCreate, onJoin }) {
  const [code, setCode] = useState("");
  const [mode, setMode] = useState(null); // "join"

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: 20,
    }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        {/* Hero */}
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 42, color: C.accent, margin: "0 0 8px",
        }}>RACI Quest</h1>
        <p style={{ color: "#8899bb", fontSize: 15, marginBottom: 48 }}>
          Командная игра для брейнсторминга ролей и ответственностей
        </p>

        {/* Actions */}
        {mode !== "join" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={onCreate} style={btnStyle(C.accent, C.bg)}>
              ✨ Создать новую игру
            </button>
            <button onClick={() => setMode("join")} style={btnOutline}>
              🔗 Войти по коду
            </button>
          </div>
        ) : (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 24,
          }}>
            <p style={{ color: "#8899bb", marginBottom: 16, fontSize: 14 }}>
              Введи код комнаты от ведущего
            </p>
            <input
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && code.length >= 4 && onJoin(code)}
              placeholder="ABCD12"
              maxLength={8}
              style={{
                width: "100%", background: C.card, border: `1.5px solid ${C.accent}`,
                borderRadius: 10, color: "#e8eef8", padding: "14px 16px",
                fontSize: 24, fontWeight: 800, letterSpacing: 6,
                textAlign: "center", outline: "none", marginBottom: 12,
                fontFamily: "'DM Sans', monospace",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setMode(null)}
                style={{ ...btnOutline, flex: 1 }}
              >← Назад</button>
              <button
                disabled={code.length < 4}
                onClick={() => onJoin(code)}
                style={{ ...btnStyle(C.accent, C.bg), flex: 2, opacity: code.length < 4 ? 0.4 : 1 }}
              >Войти →</button>
            </div>
          </div>
        )}

        <p style={{ color: "#4a5568", fontSize: 12, marginTop: 40 }}>
          Ведущий создаёт игру → делится кодом → все заходят со своих устройств
        </p>
      </div>
    </div>
  );
}

const btnStyle = (bg, color) => ({
  padding: "16px 24px", background: bg, color,
  border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", width: "100%",
});

const btnOutline = {
  padding: "16px 24px", background: "none",
  border: "1.5px solid #2a3347", color: "#8899bb",
  borderRadius: 12, fontSize: 16, fontWeight: 700,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", width: "100%",
};

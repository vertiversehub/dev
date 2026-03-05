import { useState } from "react";
import { useStorage, useMutation, useOthers } from "./liveblocks.config";
import { LiveList } from "@liveblocks/client";

// ── palette ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0d0f14", surface: "#161b24", card: "#1e2534", border: "#2a3347",
  accent: "#f0c060", accentDim: "#a07c30",
  R: { bg: "#ff4d6d22", border: "#ff4d6d", text: "#ff6b84" },
  A: { bg: "#ff8c0022", border: "#ff8c00", text: "#ffaa33" },
  C: { bg: "#00c9a722", border: "#00c9a7", text: "#33d9c0" },
  I: { bg: "#4d8aff22", border: "#4d8aff", text: "#7aaeff" },
};

const RACI_META = {
  R: { label: "Responsible", emoji: "⚡", desc: "Делает работу" },
  A: { label: "Accountable", emoji: "👑", desc: "Отвечает за результат" },
  C: { label: "Consulted", emoji: "💬", desc: "Консультирует" },
  I: { label: "Informed", emoji: "📩", desc: "Получает информацию" },
};

const DEFAULT_ROLES = ["Data Analyst", "Analytics Lead", "Data Engineer", "Product Manager", "Stakeholder"];
const DEFAULT_TASKS = [
  "Сбор требований к отчёту",
  "Разработка дашборда",
  "Валидация данных",
  "Презентация результатов",
  "Поддержка пайплайна",
];

function uid() { return Math.random().toString(36).slice(2, 8); }

// ── COMPONENTS ────────────────────────────────────────────────────────────────

function Badge({ role }) {
  if (!role || !RACI_META[role]) return null;
  const col = C[role];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 1,
      background: col.bg, border: `1px solid ${col.border}`, color: col.text,
    }}>
      {RACI_META[role].emoji} {role}
    </span>
  );
}

function RaciBtn({ value, selected, onClick, disabled }) {
  const col = selected ? C[value] : { border: "#ffffff22", text: "#8899bb" };
  return (
    <button onClick={onClick} disabled={disabled} title={RACI_META[value].desc} style={{
      padding: "6px 14px", borderRadius: 8, cursor: disabled ? "default" : "pointer",
      background: selected ? C[value].bg : "transparent",
      border: `1.5px solid ${col.border}`, color: col.text,
      fontWeight: 700, fontSize: 13, letterSpacing: .5,
      transform: selected ? "scale(1.08)" : "scale(1)",
      boxShadow: selected ? `0 0 12px ${C[value].border}55` : "none",
      transition: "all .15s",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {RACI_META[value].emoji} {value}
    </button>
  );
}

// ── MAIN GAME COMPONENT ───────────────────────────────────────────────────────

export function Game({ roomId, isHost }) {
  const others = useOthers();

  // Read from shared storage
  const screen = useStorage(r => r.screen);
  const taskIdx = useStorage(r => r.taskIdx);
  const revealed = useStorage(r => r.revealed);
  const roles = useStorage(r => r.roles);
  const tasks = useStorage(r => r.tasks);
  const votes = useStorage(r => r.votes);
  const scores = useStorage(r => r.scores);

  // Local UI state
  const [showAddRole, setShowAddRole] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Mutations (write to shared storage) ───────────────────────────────────

  const initGame = useMutation(({ storage }) => {
    const rolesList = storage.get("roles");
    const tasksList = storage.get("tasks");
    const scoresMap = storage.get("scores");

    // Add default roles if empty
    if (rolesList.length === 0) {
      DEFAULT_ROLES.forEach(name => rolesList.push({ id: uid(), name }));
    }
    if (tasksList.length === 0) {
      DEFAULT_TASKS.forEach(name => tasksList.push({ id: uid(), name }));
    }
    // Init scores
    rolesList.toArray().forEach(r => {
      if (!scoresMap.has(r.id)) scoresMap.set(r.id, 0);
    });
  }, []);

  const addRole = useMutation(({ storage }, name) => {
    const r = { id: uid(), name };
    storage.get("roles").push(r);
    storage.get("scores").set(r.id, 0);
    // Add vote slots for all existing tasks
    const votesMap = storage.get("votes");
    storage.get("tasks").toArray().forEach(t => {
      votesMap.set(`${t.id}:${r.id}`, null);
    });
  }, []);

  const removeRole = useMutation(({ storage }, roleId) => {
    const list = storage.get("roles");
    const idx = list.toArray().findIndex(r => r.id === roleId);
    if (idx >= 0) list.delete(idx);
  }, []);

  const addTask = useMutation(({ storage }, name) => {
    const t = { id: uid(), name };
    storage.get("tasks").push(t);
    // Add vote slots for all existing roles
    const votesMap = storage.get("votes");
    storage.get("roles").toArray().forEach(r => {
      votesMap.set(`${t.id}:${r.id}`, null);
    });
  }, []);

  const removeTask = useMutation(({ storage }, taskId) => {
    const list = storage.get("tasks");
    const idx = list.toArray().findIndex(t => t.id === taskId);
    if (idx >= 0) list.delete(idx);
  }, []);

  const startGame = useMutation(({ storage }) => {
    // Init all vote slots
    const votesMap = storage.get("votes");
    const rolesList = storage.get("roles").toArray();
    const tasksList = storage.get("tasks").toArray();
    tasksList.forEach(t => rolesList.forEach(r => {
      if (!votesMap.has(`${t.id}:${r.id}`)) votesMap.set(`${t.id}:${r.id}`, null);
    }));
    storage.set("screen", "game");
    storage.set("taskIdx", 0);
    storage.set("revealed", false);
  }, []);

  const castVote = useMutation(({ storage }, taskId, roleId, val) => {
    storage.get("votes").set(`${taskId}:${roleId}`, val);
  }, []);

  const revealRound = useMutation(({ storage }) => {
    storage.set("revealed", true);
    const pts = { R: 3, A: 4, C: 2, I: 1 };
    const rolesList = storage.get("roles").toArray();
    const task = storage.get("tasks").toArray()[storage.get("taskIdx")];
    const votesMap = storage.get("votes");
    const scoresMap = storage.get("scores");
    rolesList.forEach(r => {
      const v = votesMap.get(`${task.id}:${r.id}`);
      if (v) scoresMap.set(r.id, (scoresMap.get(r.id) || 0) + (pts[v] || 0));
    });
  }, []);

  const nextRound = useMutation(({ storage }) => {
    const idx = storage.get("taskIdx");
    const total = storage.get("tasks").length;
    storage.set("revealed", false);
    if (idx < total - 1) {
      storage.set("taskIdx", idx + 1);
    } else {
      storage.set("screen", "results");
    }
  }, []);

  const resetGame = useMutation(({ storage }) => {
    storage.get("roles").clear();
    storage.get("tasks").clear();
    storage.get("votes").clear();
    storage.get("scores").clear();
    storage.set("screen", "setup");
    storage.set("taskIdx", 0);
    storage.set("revealed", false);
  }, []);

  const goToTask = useMutation(({ storage }, idx) => {
    storage.set("taskIdx", idx);
    storage.set("revealed", false);
  }, []);

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (screen === null || roles === null) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.accent, fontFamily: "'DM Sans', sans-serif", fontSize: 18 }}>Загрузка...</div>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const task = tasks?.[taskIdx];
  const taskComplete = (t) => roles?.every(r => votes?.get(`${t.id}:${r.id}`) !== null && votes?.get(`${t.id}:${r.id}`) !== undefined);
  const progress = tasks?.filter(taskComplete).length || 0;

  const aCount = roles?.filter(r => votes?.get(`${task?.id}:${r.id}`) === "A").length || 0;
  const rCount = roles?.filter(r => votes?.get(`${task?.id}:${r.id}`) === "R").length || 0;
  const conflicts = [];
  if (aCount > 1) conflicts.push("⚠️ Больше одного Accountable — пересмотрите!");
  if (rCount === 0 && revealed) conflicts.push("⚠️ Нет Responsible — кто делает работу?");

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    addRole(newRoleName.trim());
    setNewRoleName(""); setShowAddRole(false);
  };

  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    addTask(newTaskName.trim());
    setNewTaskName(""); setShowAddTask(false);
  };

  // ── SETUP SCREEN ──────────────────────────────────────────────────────────
  if (screen === "setup") {
    // Init defaults on first render
    if (roles?.length === 0 && isHost) initGame();

    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: "#e8eef8" }}>
        <div style={{ maxWidth: 660, margin: "0 auto", padding: "40px 20px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🎯</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, color: C.accent, margin: 0 }}>RACI Quest</h1>
            <p style={{ color: "#8899bb", marginTop: 8 }}>Командная игра для отдела Аналитики</p>
          </div>

          {/* Share code */}
          <div style={{
            background: C.surface, border: `1px solid ${C.accent}44`,
            borderRadius: 14, padding: "16px 20px", marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 11, color: C.accentDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Код комнаты</div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 6, color: C.accent }}>{roomId}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <button onClick={copyLink} style={{
                background: copied ? "#00c9a7" : C.accent, color: C.bg,
                border: "none", borderRadius: 8, padding: "8px 16px",
                fontWeight: 800, fontSize: 13, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {copied ? "✓ Скопировано!" : "📋 Копировать ссылку"}
              </button>
              <div style={{ fontSize: 12, color: "#4a5568" }}>
                {others.length + 1} онлайн
              </div>
            </div>
          </div>

          {/* Roles */}
          <Section title="👥 Роли в команде">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {roles?.map(r => (
                <Chip key={r.id} label={r.name} onRemove={isHost ? () => removeRole(r.id) : null} />
              ))}
            </div>
            {isHost && (
              showAddRole
                ? <InlineAdd value={newRoleName} onChange={setNewRoleName} onAdd={handleAddRole} onCancel={() => setShowAddRole(false)} placeholder="Например: Scrum Master" />
                : <GhostBtn onClick={() => setShowAddRole(true)}>+ Добавить роль</GhostBtn>
            )}
          </Section>

          {/* Tasks */}
          <Section title="📋 Задачи / процессы">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {tasks?.map(t => (
                <Chip key={t.id} label={t.name} onRemove={isHost ? () => removeTask(t.id) : null} />
              ))}
            </div>
            {isHost && (
              showAddTask
                ? <InlineAdd value={newTaskName} onChange={setNewTaskName} onAdd={handleAddTask} onCancel={() => setShowAddTask(false)} placeholder="Например: Ревью модели данных" />
                : <GhostBtn onClick={() => setShowAddTask(true)}>+ Добавить задачу</GhostBtn>
            )}
          </Section>

          {isHost ? (
            <button
              disabled={!roles?.length || !tasks?.length}
              onClick={startGame}
              style={{
                width: "100%", marginTop: 28, padding: 17,
                background: C.accent, color: C.bg, border: "none", borderRadius: 12,
                fontSize: 18, fontWeight: 900, cursor: "pointer", letterSpacing: 1,
                opacity: roles?.length && tasks?.length ? 1 : 0.4,
                fontFamily: "'DM Sans', sans-serif",
              }}>
              🚀 НАЧАТЬ ИГРУ
            </button>
          ) : (
            <div style={{ marginTop: 28, padding: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, textAlign: "center", color: "#8899bb" }}>
              ⏳ Ждём пока ведущий начнёт игру...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS SCREEN ────────────────────────────────────────────────────────
  if (screen === "results") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: "#e8eef8" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 56 }}>🏆</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: C.accent, margin: "8px 0 4px" }}>RACI-матрица готова!</h1>
            <p style={{ color: "#8899bb" }}>Результат брейнсторминга отдела Аналитики</p>
          </div>

          {/* Matrix */}
          <div style={{ overflowX: "auto", marginBottom: 28 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thS}>Задача</th>
                  {roles?.map(r => <th key={r.id} style={{ ...thS, textAlign: "center" }}>{r.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {tasks?.map((t, ti) => (
                  <tr key={t.id} style={{ background: ti % 2 === 0 ? C.surface : C.card }}>
                    <td style={{ padding: "11px 14px", color: "#c8d8f0", borderBottom: `1px solid ${C.border}` }}>{t.name}</td>
                    {roles?.map(r => {
                      const v = votes?.get(`${t.id}:${r.id}`);
                      const col = v ? C[v] : null;
                      return (
                        <td key={r.id} style={{ padding: "10px 8px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
                          {v ? (
                            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontWeight: 800, fontSize: 12, background: col.bg, border: `1px solid ${col.border}`, color: col.text }}>
                              {RACI_META[v].emoji} {v}
                            </span>
                          ) : <span style={{ color: "#4a5568" }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Insights */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
            {Object.entries(RACI_META).map(([k, m]) => {
              const rolesWith = roles?.filter(r => tasks?.some(t => votes?.get(`${t.id}:${r.id}`) === k)) || [];
              return (
                <div key={k} style={{ background: C.surface, border: `1px solid ${C[k].border}44`, borderRadius: 12, padding: 16 }}>
                  <div style={{ color: C[k].text, fontWeight: 800, marginBottom: 8, fontSize: 14 }}>{m.emoji} {k} — {m.label}</div>
                  {rolesWith.length === 0
                    ? <span style={{ color: "#8899bb", fontSize: 13 }}>Не назначено</span>
                    : rolesWith.map(r => (
                      <span key={r.id} style={{ display: "inline-block", margin: "2px 4px 2px 0", padding: "2px 10px", borderRadius: 20, fontSize: 12, background: C[k].bg, border: `1px solid ${C[k].border}44`, color: C[k].text }}>{r.name}</span>
                    ))
                  }
                </div>
              );
            })}
          </div>

          {isHost && (
            <button onClick={resetGame} style={{
              width: "100%", padding: 15, background: "none",
              border: `1.5px solid ${C.accent}`, color: C.accent,
              borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>🔄 Начать заново</button>
          )}
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ───────────────────────────────────────────────────────────
  if (!task) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: "#e8eef8" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.accent }}>🎯 RACI Quest</div>
            <div style={{ color: "#8899bb", fontSize: 13, marginTop: 3 }}>
              Раунд {taskIdx + 1} / {tasks?.length} · {others.length + 1} онлайн
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {isHost && <MiniBtn accent onClick={() => { setShowAddRole(s => !s); setShowAddTask(false); }}>+ роль</MiniBtn>}
            {isHost && <MiniBtn accent onClick={() => { setShowAddTask(s => !s); setShowAddRole(false); }}>+ задача</MiniBtn>}
            <MiniBtn onClick={() => setShowAll(s => !s)}>{showAll ? "← назад" : "все задачи"}</MiniBtn>
          </div>
        </div>

        {/* Inline adds (host only) */}
        {showAddRole && (
          <InlineAdd value={newRoleName} onChange={setNewRoleName} onAdd={handleAddRole} onCancel={() => setShowAddRole(false)} placeholder="Имя новой роли" />
        )}
        {showAddTask && (
          <InlineAdd value={newTaskName} onChange={setNewTaskName} onAdd={handleAddTask} onCancel={() => setShowAddTask(false)} placeholder="Название новой задачи" />
        )}

        {/* Progress bar */}
        <div style={{ height: 6, background: C.border, borderRadius: 4, margin: "14px 0 22px" }}>
          <div style={{
            height: "100%", borderRadius: 4, background: C.accent,
            width: `${tasks?.length ? (progress / tasks.length) * 100 : 0}%`,
            transition: "width .5s cubic-bezier(.4,0,.2,1)",
            boxShadow: `0 0 8px ${C.accent}88`,
          }} />
        </div>

        {/* All tasks view */}
        {showAll ? (
          <div style={{ display: "grid", gap: 10 }}>
            {tasks?.map((t, i) => (
              <div key={t.id} onClick={() => isHost && goToTask(i)} style={{
                background: C.card, border: `1px solid ${taskComplete(t) ? C.C.border + "88" : C.border}`,
                borderRadius: 10, padding: "14px 18px", cursor: isHost ? "pointer" : "default",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ color: "#c8d8f0", fontSize: 14 }}>{i + 1}. {t.name}</span>
                <span style={{ fontSize: 12, color: taskComplete(t) ? C.C.text : "#8899bb" }}>
                  {taskComplete(t) ? "✅ Готово" : i === taskIdx ? "▶️ Текущий" : "⏳"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Task card */}
            <div style={{ background: C.surface, border: `1.5px solid ${C.accent}44`, borderRadius: 16, padding: "22px 26px", marginBottom: 18, boxShadow: `0 0 40px ${C.accent}0d` }}>
              <div style={{ fontSize: 11, color: C.accentDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Задача {taskIdx + 1} из {tasks?.length}</div>
              <div style={{ fontSize: 21, color: "#e8eef8", fontWeight: 700 }}>{task.name}</div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {Object.entries(RACI_META).map(([k, m]) => (
                <span key={k} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, background: C[k].bg, border: `1px solid ${C[k].border}`, color: C[k].text }}>
                  {m.emoji} <b>{k}</b> — {m.desc}
                </span>
              ))}
            </div>

            {/* Voting grid */}
            <div style={{ display: "grid", gap: 8 }}>
              {roles?.map(r => {
                const current = votes?.get(`${task.id}:${r.id}`);
                return (
                  <div key={r.id} style={{
                    background: C.card, border: `1px solid ${current ? C[current].border + "66" : C.border}`,
                    borderRadius: 12, padding: "12px 16px",
                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                    transition: "border-color .2s",
                  }}>
                    <div style={{ minWidth: 130, color: "#c8d8f0", fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                      {["R", "A", "C", "I"].map(v => (
                        <RaciBtn key={v} value={v} selected={current === v}
                          disabled={revealed}
                          onClick={() => castVote(task.id, r.id, v)} />
                      ))}
                    </div>
                    {revealed && current && <Badge role={current} />}
                  </div>
                );
              })}
            </div>

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#ff4d6d0d", border: "1px solid #ff4d6d33" }}>
                {conflicts.map((c, i) => <div key={i} style={{ color: "#ff6b84", fontSize: 13 }}>{c}</div>)}
              </div>
            )}

            {/* Host controls */}
            {isHost && (
              <div style={{ marginTop: 18 }}>
                {!revealed ? (
                  <button disabled={!taskComplete(task)} onClick={revealRound} style={{
                    width: "100%", padding: 14, background: C.accent, color: C.bg,
                    border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer",
                    opacity: taskComplete(task) ? 1 : 0.4, fontFamily: "'DM Sans', sans-serif",
                  }}>🎲 Показать результат раунда</button>
                ) : (
                  <button onClick={nextRound} style={{
                    width: "100%", padding: 14,
                    background: taskIdx < (tasks?.length || 0) - 1 ? "#00c9a7" : C.accent,
                    color: C.bg, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {taskIdx < (tasks?.length || 0) - 1 ? "➡️ Следующий раунд" : "🏆 Завершить игру"}
                  </button>
                )}
              </div>
            )}

            {!isHost && (
              <div style={{ marginTop: 16, padding: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, textAlign: "center", color: "#8899bb", fontSize: 14 }}>
                {revealed ? "✅ Раунд завершён — ждём ведущего" : "Выбери роль для каждого участника 👆"}
              </div>
            )}

            {/* Scoreboard */}
            <div style={{ marginTop: 22, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.accentDim, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>🏅 Счёт</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...(roles || [])].sort((a, b) => (scores?.get(b.id) || 0) - (scores?.get(a.id) || 0)).map((r, i) => (
                  <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 13 }}>
                    <span style={{ color: C.accent, fontWeight: 700 }}>{i === 0 ? "👑 " : ""}{r.name}</span>
                    <span style={{ color: "#8899bb", marginLeft: 8 }}>{scores?.get(r.id) || 0} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ background: "#161b24", border: "1px solid #2a3347", borderRadius: 12, padding: 20, marginBottom: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#a07c30", marginBottom: 14, fontWeight: 700 }}>{title}</div>
      {children}
    </div>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1e2534", border: "1px solid #2a3347", borderRadius: 20, padding: "4px 12px", fontSize: 13, color: "#c8d8f0" }}>
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#ff6b84", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
      )}
    </span>
  );
}

function GhostBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "1px dashed #2a3347", color: "#8899bb", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </button>
  );
}

function MiniBtn({ onClick, children, accent }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: `1px solid ${accent ? "#f0c06066" : "#2a3347"}`,
      color: accent ? "#f0c060" : "#8899bb", borderRadius: 8, padding: "5px 12px",
      cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif",
    }}>{children}</button>
  );
}

function InlineAdd({ value, onChange, onAdd, onCancel, placeholder }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <input
        autoFocus value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onAdd(); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder}
        style={{ flex: 1, background: "#1e2534", border: "1px solid #f0c060", borderRadius: 8, color: "#e8eef8", padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
      />
      <button onClick={onAdd} style={{ background: "#f0c060", color: "#0d0f14", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+</button>
      <button onClick={onCancel} style={{ background: "none", border: "1px solid #2a3347", color: "#8899bb", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>✕</button>
    </div>
  );
}

const thS = {
  padding: "12px 10px", background: "#1a2030", color: "#8899bb",
  fontWeight: 700, textAlign: "left",
  borderBottom: "2px solid #f0c06033", fontSize: 12, letterSpacing: .5,
};

import { useState, useEffect } from "react";
import { RoomProvider } from "./liveblocks.config";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { Lobby } from "./Lobby.jsx";
import { Game } from "./Game.jsx";

function uid() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [role, setRole] = useState(null); // "host" | "player"

  // Check URL for room code on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code) {
      setRoomId(code);
      setRole("player");
    }
  }, []);

  const createRoom = () => {
    const code = uid();
    setRoomId(code);
    setRole("host");
    window.history.replaceState({}, "", `?room=${code}`);
  };

  const joinRoom = (code) => {
    const clean = code.trim().toUpperCase();
    setRoomId(clean);
    setRole("player");
    window.history.replaceState({}, "", `?room=${clean}`);
  };

  if (!roomId) {
    return <Lobby onCreate={createRoom} onJoin={joinRoom} />;
  }

  return (
    <RoomProvider
      id={`raci-quest-${roomId}`}
      initialPresence={{ name: role === "host" ? "Ведущий" : "Участник" }}
      initialStorage={{
        // Game state
        screen: "setup",          // "setup" | "game" | "results"
        taskIdx: 0,
        revealed: false,
        // Data
        roles: new LiveList([]),
        tasks: new LiveList([]),
        votes: new LiveMap(),     // "taskId:roleId" -> "R"|"A"|"C"|"I"|null
        scores: new LiveMap(),    // roleId -> number
      }}
    >
      <Game roomId={roomId} isHost={role === "host"} />
    </RoomProvider>
  );
}

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  // Замени на свой Public API Key из https://liveblocks.io/dashboard
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY,
});

export const {
  RoomProvider,
  useStorage,
  useMutation,
  useOthers,
  useSelf,
} = createRoomContext(client);

type Listener = (payload: unknown) => void;

declare global {
  var __workquizRealtime:
    | {
        rooms: Map<string, Set<Listener>>;
      }
    | undefined;
}

function state() {
  globalThis.__workquizRealtime ??= {
    rooms: new Map<string, Set<Listener>>(),
  };

  return globalThis.__workquizRealtime;
}

export function subscribe(room: string, listener: Listener) {
  const rooms = state().rooms;
  const listeners = rooms.get(room) ?? new Set<Listener>();
  listeners.add(listener);
  rooms.set(room, listeners);

  return () => {
    const current = rooms.get(room);
    if (!current) {
      return;
    }

    current.delete(listener);
    if (current.size === 0) {
      rooms.delete(room);
    }
  };
}

export function publish(room: string, payload: unknown) {
  const listeners = state().rooms.get(room);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener(payload);
  }
}

import { useSyncExternalStore } from 'react';

// One clock for every elapsed time on screen: a single timer ticking each second while anything listens, rather than
// one per row (the agents list can have a hundred and fifty).

const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** The time now, updated every second. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now);
}

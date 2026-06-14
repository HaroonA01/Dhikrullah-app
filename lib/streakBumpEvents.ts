export interface StreakBumpPayload {
  from: number;
  to: number;
}

type Listener = (payload: StreakBumpPayload) => void;

const listeners = new Set<Listener>();

export const streakBumpEvents = {
  emit(payload: StreakBumpPayload) {
    for (const l of Array.from(listeners)) l(payload);
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

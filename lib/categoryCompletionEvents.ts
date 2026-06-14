import type { CategoryId } from '@/types';

export interface CategoryCompletionPayload {
  categoryId: CategoryId;
}

type Listener = (payload: CategoryCompletionPayload) => void;

const listeners = new Set<Listener>();

export const categoryCompletionEvents = {
  emit(payload: CategoryCompletionPayload) {
    listeners.forEach((l) => l(payload));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

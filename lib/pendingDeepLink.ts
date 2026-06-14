let pendingCategoryId: string | null = null;
let splashDone = false;
const listeners = new Set<(categoryId: string) => void>();

export const pendingDeepLink = {
  set(categoryId: string) {
    pendingCategoryId = categoryId;
    for (const l of Array.from(listeners)) l(categoryId);
  },
  consume(): string | null {
    const v = pendingCategoryId;
    pendingCategoryId = null;
    return v;
  },
  peek(): string | null {
    return pendingCategoryId;
  },
  markSplashDone() {
    splashDone = true;
  },
  isSplashDone(): boolean {
    return splashDone;
  },
  subscribe(fn: (categoryId: string) => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

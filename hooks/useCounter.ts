import { useCallback } from 'react';
import { CategoryId, CounterState } from '@/types';
import { useCounterContext } from '@/context/CounterContext';
import type { DhikrVariantId } from '@/lib/dhikrCompletionVariants';

interface UseCounterResult {
  hydrated: boolean;
  state: CounterState;
  confettiTick: number;
  confettiVariant: DhikrVariantId;
  incrementCurrent: () => void;
  decrementCurrent: () => void;
  nextDhikr: () => void;
  prevDhikr: () => void;
  resetAll: () => void;
  beginTutorialSandbox: () => void;
  endTutorialSandbox: () => void;
  resetTutorialSandbox: () => void;
}

const EMPTY_STATE: CounterState = { currentDhikrIndex: 0, counts: {} };

export function useCounter(categoryId: CategoryId): UseCounterResult {
  const ctx = useCounterContext();
  const state = ctx.states[categoryId] ?? EMPTY_STATE;
  const confettiTick = ctx.confettiTicks[categoryId] ?? 0;
  const confettiVariant = ctx.confettiVariants[categoryId] ?? 'd1';

  const incrementCurrent = useCallback(() => ctx.incrementCurrent(categoryId), [ctx, categoryId]);
  const decrementCurrent = useCallback(() => ctx.decrementCurrent(categoryId), [ctx, categoryId]);
  const nextDhikr = useCallback(() => ctx.nextDhikr(categoryId), [ctx, categoryId]);
  const prevDhikr = useCallback(() => ctx.prevDhikr(categoryId), [ctx, categoryId]);
  const resetAll = useCallback(() => ctx.resetAll(categoryId), [ctx, categoryId]);
  const beginTutorialSandbox = useCallback(() => ctx.beginTutorialSandbox(categoryId), [ctx, categoryId]);
  const endTutorialSandbox = useCallback(() => ctx.endTutorialSandbox(categoryId), [ctx, categoryId]);
  const resetTutorialSandbox = useCallback(() => ctx.resetTutorialSandbox(categoryId), [ctx, categoryId]);

  return {
    hydrated: ctx.hydrated,
    state,
    confettiTick,
    confettiVariant,
    incrementCurrent,
    decrementCurrent,
    nextDhikr,
    prevDhikr,
    resetAll,
    beginTutorialSandbox,
    endTutorialSandbox,
    resetTutorialSandbox,
  };
}

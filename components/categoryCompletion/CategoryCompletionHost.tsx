import { useEffect, useState } from 'react';
import { useCounterContext } from '@/context/CounterContext';
import {
  categoryCompletionEvents,
  type CategoryCompletionPayload,
} from '@/lib/categoryCompletionEvents';
import type { Category, CategoryId } from '@/types';
import { CategoryCompletionV1Confetti } from './V1Confetti';

const PRODUCTION_BACKDROP_DIM = 0.75;

export function CategoryCompletionHost() {
  const { categories } = useCounterContext();
  const [event, setEvent] = useState<
    (CategoryCompletionPayload & { key: number }) | null
  >(null);

  useEffect(
    () =>
      categoryCompletionEvents.subscribe((payload) => {
        setEvent((prev) => ({ ...payload, key: (prev?.key ?? 0) + 1 }));
      }),
    [],
  );

  if (!event) return null;

  const cat =
    categories.find((c) => c.id === event.categoryId) ??
    ({ id: event.categoryId as CategoryId, label: '', sortOrder: 0 } as Category);

  return (
    <CategoryCompletionV1Confetti
      key={event.key}
      category={cat}
      onClose={() => setEvent(null)}
      backdropDim={PRODUCTION_BACKDROP_DIM}
    />
  );
}

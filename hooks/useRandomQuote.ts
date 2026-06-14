import { useMemo } from 'react';
import { QUOTES } from '@/data/quotes';
import { Quote } from '@/types';

export function useRandomQuote(): Quote {
  return useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);
}

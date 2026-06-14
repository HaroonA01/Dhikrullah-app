import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { addFavourite, getAllFavouriteIds, removeFavourite } from '@/db/queries';

interface ContextValue {
  hydrated: boolean;
  favouriteIds: Set<string>;
  toggle: (id: string) => void;
  isFavourite: (id: string) => boolean;
}

const FavouritesContext = createContext<ContextValue | null>(null);

export const FavouritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await getAllFavouriteIds();
      if (!cancelled) {
        setFavouriteIds(new Set(rows.map((r) => r.id)));
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setFavouriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        removeFavourite(id).catch(() => {});
      } else {
        next.add(id);
        addFavourite(id).catch(() => {});
      }
      return next;
    });
  }, []);

  const isFavourite = useCallback((id: string) => favouriteIds.has(id), [favouriteIds]);

  return (
    <FavouritesContext.Provider value={{ hydrated, favouriteIds, toggle, isFavourite }}>
      {children}
    </FavouritesContext.Provider>
  );
};

export const useFavourites = (): ContextValue => {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error('useFavourites must be used inside FavouritesProvider');
  return ctx;
};

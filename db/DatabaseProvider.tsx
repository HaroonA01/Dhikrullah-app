import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { GradientBackground } from '@/components/GradientBackground';
import { useTheme } from '@/context/ThemeContext';
import { db } from './index';
import migrations from '../drizzle/migrations';
import { seedIfNeeded } from './seed';
import { migrateFromAsyncStorageIfNeeded } from './migrateFromAsyncStorage';
import {
  backfillCategoryProgressIfNeeded,
  backfillLifetimeIfNeeded,
} from './queries';

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { palette } = useTheme();
  const { success, error } = useMigrations(db, migrations);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    let cancelled = false;
    (async () => {
      try {
        await migrateFromAsyncStorageIfNeeded();
        await seedIfNeeded();
        await backfillLifetimeIfNeeded();
        await backfillCategoryProgressIfNeeded();
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setBootError(e as Error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [success]);

  const err = error ?? bootError;
  if (err) {
    return (
      <View style={styles.root}>
        <GradientBackground />
        <Text style={[styles.errTitle, { color: palette.textDark }]}>
          Database error
        </Text>
        <Text style={[styles.errBody, { color: palette.textMid }]}>{err.message}</Text>
      </View>
    );
  }

  if (!success || !ready) {
    // No "Loading…" text — migrations + seed are usually <100 ms, and a brief
    // text flash before the animated splash feels jarring. Just hold the
    // gradient so the boot blends straight into the splash.
    return (
      <View style={styles.root}>
        <GradientBackground />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errBody: {
    textAlign: 'center',
    fontSize: 13,
  },
});

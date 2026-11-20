import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

const SPLASH_KEY = 'stride/splash/v1';

/**
 * The animated boot splash plays once. It lives in the same tiny store shape as
 * onboarding so the root layout can tell "not read yet" (`null`) from "already
 * played" (`true`) and never flash the splash on a cold start.
 */
let seen: boolean | null = null;
let load: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return seen;
}

function getServerSnapshot() {
  return null;
}

export function loadSplashSeen() {
  if (!load) {
    load = AsyncStorage.getItem(SPLASH_KEY)
      .then((value) => value === 'true')
      .catch(() => false)
      .then((stored) => {
        if (seen === null) {
          seen = stored;
          emit();
        }
        return seen === true;
      });
  }
  return load;
}

/** Marks the splash as shown; the next launch goes straight to the app. */
export function markSplashSeen() {
  if (seen === true) return;
  seen = true;
  emit();
  AsyncStorage.setItem(SPLASH_KEY, 'true').catch((error) =>
    console.warn('Failed to remember the splash.', error)
  );
}

/** `true` once played, `false` on the first launch, `null` while loading. */
export function useSplashSeen() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void loadSplashSeen();
  }, []);

  return value;
}

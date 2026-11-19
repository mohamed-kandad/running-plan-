import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

const ONBOARDING_KEY = 'stride/onboarding/v1';

/**
 * The welcome screen is shown once. The flag lives in a tiny external store so the
 * root layout (which renders the router) and the welcome screen share one value.
 * `null` means "still reading from storage".
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

export function loadOnboarding() {
  if (!load) {
    load = AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => value === 'true')
      .catch(() => false)
      // A completion that happened while we were reading wins over the stored value.
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

/** Marks the welcome screen as done; the router then moves on to the tabs. */
export function markOnboardingSeen() {
  if (seen === true) return;
  seen = true;
  emit();
  AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch((error) =>
    console.warn('Failed to remember onboarding.', error)
  );
}

/** `true` once dismissed, `false` on a first launch, `null` while loading. */
export function useOnboardingSeen() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void loadOnboarding();
  }, []);

  return value;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

const NAME_KEY = 'stride/user/name/v1';

/**
 * The name captured on the welcome screen. Stored on its own (not in AppStore)
 * so "reset all data" does not wipe the greeting.
 */
let name = '';
const listeners = new Set<() => void>();
let load: Promise<string> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

export function loadUserName() {
  if (!load) {
    load = AsyncStorage.getItem(NAME_KEY)
      .then((value) => value ?? '')
      .catch(() => '')
      .then((stored) => {
        // A name saved while we were reading wins over the stored value.
        if (name === '') {
          name = stored;
          emit();
        }
        return name;
      });
  }
  return load;
}

/** Saves the name and returns once it is persisted. */
export function saveUserName(value: string) {
  const next = value.trim();
  name = next;
  emit();
  return AsyncStorage.setItem(NAME_KEY, next).catch((error) => {
    console.warn('Failed to remember your name.', error);
  });
}

export function getUserName() {
  return name;
}

export function subscribeUserName(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The saved name, `''` until it has been read from storage. */
export function useUserName() {
  const value = useSyncExternalStore(subscribeUserName, getUserName, () => '');

  useEffect(() => {
    void loadUserName();
  }, []);

  return value;
}

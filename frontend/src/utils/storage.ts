/**
 * Typed wrapper over AsyncStorage.
 *
 * Centralising access means keys are never typed as string literals at call
 * sites and a storage failure degrades gracefully instead of crashing a screen.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {STORAGE_KEYS} from './constants';
import {getLogger} from './logger';

const logger = getLogger('storage');

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Read and parse a JSON value, returning null when absent or unreadable. */
export async function getItem<T>(key: StorageKey): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch (error) {
    // Unreadable is treated as absent: a corrupt value must not stop the app
    // from starting, and the caller's "not signed in" path is already correct.
    logger.error(`Could not read ${key}`, error);
    return null;
  }
}

/** Serialise and store a value. */
export async function setItem<T>(key: StorageKey, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error(`Could not write ${key}`, error);
  }
}

/** Remove a single key. */
export async function removeItem(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logger.error(`Could not remove ${key}`, error);
  }
}

/** Clear every key this app owns. Called on logout. */
export async function clearAll(): Promise<void> {
  try {
    // Only this app's namespaced keys, never AsyncStorage.clear(), which would
    // also wipe whatever the libraries in the build have stored.
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    logger.error('Could not clear storage', error);
  }
}

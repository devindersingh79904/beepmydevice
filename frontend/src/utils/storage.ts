/**
 * Typed wrapper over AsyncStorage.
 *
 * Centralising access means keys are never typed as string literals at call
 * sites and a storage failure degrades gracefully instead of crashing a screen.
 */

import {STORAGE_KEYS} from './constants';

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Read and parse a JSON value, returning null when absent or unreadable. */
export async function getItem<T>(_key: StorageKey): Promise<T | null> {
  throw new Error('Not implemented');
}

/** Serialise and store a value. */
export async function setItem<T>(_key: StorageKey, _value: T): Promise<void> {
  throw new Error('Not implemented');
}

/** Remove a single key. */
export async function removeItem(_key: StorageKey): Promise<void> {
  throw new Error('Not implemented');
}

/** Clear every key this app owns. Called on logout. */
export async function clearAll(): Promise<void> {
  throw new Error('Not implemented');
}

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Small key-value store: SecureStore on devices, localStorage on web. */
export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

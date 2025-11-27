import { GraphState, createEmptyGraphState } from './types';

const STORAGE_KEY = 'xyflow-architecture-graph';
const DEFAULT_PROJECT_ID = 'default-project';

/**
 * Storage adapter that uses browser localStorage for demo mode
 * Falls back to in-memory storage if localStorage is not available
 */
export class LocalStorageAdapter {
  private inMemoryStorage: Map<string, string> = new Map();

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && this.isLocalStorageAvailable()) {
      return localStorage;
    }
    return null;
  }

  async getGraphState(): Promise<GraphState> {
    const storage = this.getStorage();

    try {
      const data = storage
        ? storage.getItem(STORAGE_KEY)
        : this.inMemoryStorage.get(STORAGE_KEY);

      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load graph from storage:', error);
    }

    // Return empty graph if nothing exists
    return createEmptyGraphState(DEFAULT_PROJECT_ID);
  }

  async saveGraphState(state: GraphState): Promise<void> {
    const storage = this.getStorage();
    const data = JSON.stringify(state);

    if (storage) {
      storage.setItem(STORAGE_KEY, data);
    } else {
      this.inMemoryStorage.set(STORAGE_KEY, data);
    }
  }

  async clearGraphState(): Promise<void> {
    const storage = this.getStorage();

    if (storage) {
      storage.removeItem(STORAGE_KEY);
    } else {
      this.inMemoryStorage.delete(STORAGE_KEY);
    }
  }
}

// Singleton instance
let storageInstance: LocalStorageAdapter | null = null;

export function getStorageAdapter(): LocalStorageAdapter {
  if (!storageInstance) {
    storageInstance = new LocalStorageAdapter();
  }
  return storageInstance;
}

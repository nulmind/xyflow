/**
 * Demo mode configuration and utilities
 *
 * Demo mode allows the app to run without a backend, using localStorage
 * and optional client-side LLM calls with user-provided API key.
 */

export interface DemoModeConfig {
  enabled: boolean;
  llmApiKey?: string;
  llmModel?: string;
  llmBaseUrl?: string;
}

const DEMO_MODE_KEY = 'xyflow-demo-mode';
const DEMO_LLM_CONFIG_KEY = 'xyflow-demo-llm-config';

/**
 * Check if demo mode is enabled
 * Demo mode is enabled if:
 * 1. NEXT_PUBLIC_DEMO_MODE env var is set to 'true'
 * 2. Or user has manually enabled it in browser
 */
export function isDemoModeEnabled(): boolean {
  // Check environment variable first
  if (typeof window !== 'undefined') {
    const envDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    if (envDemoMode) return true;

    // Check localStorage
    try {
      return localStorage.getItem(DEMO_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Enable or disable demo mode
 */
export function setDemoMode(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    try {
      if (enabled) {
        localStorage.setItem(DEMO_MODE_KEY, 'true');
      } else {
        localStorage.removeItem(DEMO_MODE_KEY);
      }
    } catch (error) {
      console.error('Failed to set demo mode:', error);
    }
  }
}

/**
 * Get LLM configuration for demo mode
 */
export function getDemoLLMConfig(): { apiKey?: string; model?: string; baseUrl?: string } {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(DEMO_LLM_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          (parsed.apiKey === undefined || typeof parsed.apiKey === 'string') &&
          (parsed.model === undefined || typeof parsed.model === 'string') &&
          (parsed.baseUrl === undefined || typeof parsed.baseUrl === 'string')
        ) {
          return parsed;
        }
        // If validation fails, fall through to return {}
      }
    } catch (error) {
      console.error('Failed to get demo LLM config:', error);
    }
  }
  return {};
}

/**
 * Save LLM configuration for demo mode
 */
export function setDemoLLMConfig(config: {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DEMO_LLM_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save demo LLM config:', error);
    }
  }
}

/**
 * Clear LLM configuration
 */
export function clearDemoLLMConfig(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(DEMO_LLM_CONFIG_KEY);
    } catch (error) {
      console.error('Failed to clear demo LLM config:', error);
    }
  }
}

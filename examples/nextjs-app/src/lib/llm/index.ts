// LLM Provider Abstraction

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProviderConfig {
  provider: 'openai-compatible';
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface LLMClient {
  complete(args: { messages: LLMMessage[] }): Promise<string>;
}

// Factory function to create an LLM client based on configuration
export function createLLMClient(config: LLMProviderConfig): LLMClient {
  switch (config.provider) {
    case 'openai-compatible':
      // Lazy import to keep bundle size down
      const { OpenAICompatibleClient } = require('./openai-compatible');
      return new OpenAICompatibleClient(config);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

// Get LLM client from environment variables
export function getLLMClientFromEnv(): LLMClient {
  const provider = process.env.LLM_PROVIDER || 'openai-compatible';
  const apiKey = process.env.LLM_API_KEY || '';
  const baseURL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable is required');
  }

  return createLLMClient({
    provider: provider as 'openai-compatible',
    apiKey,
    baseURL,
    model,
  });
}

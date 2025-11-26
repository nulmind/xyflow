import { LLMClient, LLMMessage, LLMProviderConfig } from './index';

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAICompatibleClient implements LLMClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.model = config.model;
  }

  async complete(args: { messages: LLMMessage[] }): Promise<string> {
    const endpoint = `${this.baseURL}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: args.messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const data: OpenAICompletionResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from LLM');
    }

    return data.choices[0].message.content;
  }
}

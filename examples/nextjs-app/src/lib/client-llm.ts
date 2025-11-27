/**
 * Client-side LLM integration for demo mode
 * Makes LLM API calls directly from the browser using user-provided API key
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ClientLLMConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Call OpenAI-compatible API from the browser
 */
export async function callLLMFromBrowser(
  messages: LLMMessage[],
  config: ClientLLMConfig
): Promise<string> {
  const {
    apiKey,
    model = 'gpt-4o-mini',
    baseUrl = 'https://api.openai.com/v1',
  } = config;

  if (!apiKey) {
    throw new Error('API key is required for demo mode LLM calls');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `LLM API call failed: ${response.status} ${response.statusText}. ${
        errorData.error?.message || ''
      }`
    );
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from LLM API');
  }

  return data.choices[0].message.content;
}

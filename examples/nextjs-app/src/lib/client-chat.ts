/**
 * Client-side chat handler for demo mode
 * Processes chat messages entirely in the browser
 */

import { GraphState, GraphDelta, GraphDeltaSchema } from './types';
import { buildLLMMessages, generateChangeSummary } from './prompts';
import { mergeGraphDelta, validateGraphState, autoLayoutNodes } from './graph-utils';
import { callLLMFromBrowser, ClientLLMConfig } from './client-llm';

export interface ClientChatRequest {
  message: string;
  graphState: GraphState;
  llmConfig: ClientLLMConfig;
}

export interface ClientChatResponse {
  assistantMessage: string;
  graphState: GraphState;
}

/**
 * Process a chat message client-side (for demo mode)
 */
export async function processChatClientSide(
  request: ClientChatRequest
): Promise<ClientChatResponse> {
  const { message, graphState, llmConfig } = request;

  // Build LLM messages
  const messages = buildLLMMessages(message, graphState);

  // Call the LLM
  let llmResponse: string;
  try {
    llmResponse = await callLLMFromBrowser(messages, llmConfig);
  } catch (error) {
    throw new Error(
      `Failed to get response from AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Parse the LLM response as JSON
  let delta: GraphDelta;
  try {
    delta = parseAndValidateDelta(llmResponse);
  } catch (parseError) {
    console.error('Failed to parse LLM response:', parseError);
    console.error('Raw response:', llmResponse);
    throw new Error(
      `Couldn't parse AI response. ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
    );
  }

  // Apply auto-layout to new nodes
  if (delta.addNodes && delta.addNodes.length > 0) {
    const existingNodesCount = graphState.nodes.length;
    const startY =
      existingNodesCount > 0
        ? Math.max(...graphState.nodes.map((n) => n.position.y)) + 150
        : 100;

    delta.addNodes = autoLayoutNodes(delta.addNodes, 100, startY);
  }

  // Merge delta into graph state
  let newState = mergeGraphDelta(graphState, delta);

  // Validate the new state
  const validation = validateGraphState(newState);
  if (!validation.valid) {
    console.warn('Graph validation warnings:', validation.errors);
    // Continue anyway, but log the issues
  }

  // Generate a summary of changes
  const assistantMessage = generateChangeSummary(delta);

  return {
    assistantMessage,
    graphState: newState,
  };
}

/**
 * Attempts to parse and validate the LLM response as a GraphDelta
 */
function parseAndValidateDelta(response: string): GraphDelta {
  // Clean up the response - remove markdown code blocks if present
  let cleaned = response.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  // Try to parse as JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from the response using regex
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not find valid JSON in response');
    }
  }

  // Validate against the schema
  const result = GraphDeltaSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid GraphDelta: ${result.error.message}`);
  }

  return result.data;
}

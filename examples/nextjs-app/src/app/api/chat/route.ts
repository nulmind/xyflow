import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { GraphState, GraphDelta, GraphDeltaSchema, GraphStateSchema } from '@/lib/types';
import { getLLMClientFromEnv } from '@/lib/llm';
import { buildLLMMessages, generateChangeSummary } from '@/lib/prompts';
import { mergeGraphDelta, validateGraphState, autoLayoutNodes } from '@/lib/graph-utils';

const DEFAULT_PROJECT_ID = 'default-project';

interface ChatRequestBody {
  message: string;
  graphState: GraphState;
}

/**
 * POST /api/chat
 * Processes a chat message, calls the LLM, and returns updated graph state.
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();

    // Validate inputs
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Load canonical graph from DB (don't trust client blindly)
    let canonicalState: GraphState;

    const graph = await prisma.graph.findFirst({
      where: { projectId: DEFAULT_PROJECT_ID },
      orderBy: { updatedAt: 'desc' },
    });

    if (graph) {
      try {
        canonicalState = JSON.parse(graph.state);
      } catch {
        canonicalState = body.graphState;
      }
    } else {
      canonicalState = body.graphState;
    }

    // Build LLM messages
    const messages = buildLLMMessages(body.message, canonicalState);

    // Call the LLM
    let llmResponse: string;
    try {
      const llmClient = getLLMClientFromEnv();
      llmResponse = await llmClient.complete({ messages });
    } catch (error) {
      console.error('LLM call failed:', error);
      return NextResponse.json(
        {
          error: 'Failed to get response from AI',
          assistantMessage: 'Sorry, I encountered an error while processing your request. Please check your LLM configuration.',
          graphState: canonicalState,
        },
        { status: 500 }
      );
    }

    // Parse the LLM response as JSON
    let delta: GraphDelta;
    try {
      delta = parseAndValidateDelta(llmResponse);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
      console.error('Raw response:', llmResponse);
      return NextResponse.json({
        assistantMessage: `I couldn't parse the AI response properly. Please try rephrasing your request. (Error: ${parseError instanceof Error ? parseError.message : 'Unknown error'})`,
        graphState: canonicalState,
      });
    }

    // Apply auto-layout to new nodes
    if (delta.addNodes && delta.addNodes.length > 0) {
      // Calculate positions for new nodes based on existing ones
      const existingNodesCount = canonicalState.nodes.length;
      const startY = existingNodesCount > 0
        ? Math.max(...canonicalState.nodes.map(n => n.position.y)) + 150
        : 100;

      delta.addNodes = autoLayoutNodes(delta.addNodes, 100, startY);
    }

    // Merge delta into graph state
    let newState = mergeGraphDelta(canonicalState, delta);

    // Validate the new state
    const validation = validateGraphState(newState);
    if (!validation.valid) {
      console.warn('Graph validation warnings:', validation.errors);
      // Continue anyway, but log the issues
    }

    // Persist the updated state
    const existingGraph = await prisma.graph.findFirst({
      where: { projectId: DEFAULT_PROJECT_ID },
      orderBy: { updatedAt: 'desc' },
    });

    if (existingGraph) {
      await prisma.graph.update({
        where: { id: existingGraph.id },
        data: { state: JSON.stringify(newState) },
      });
    } else {
      await prisma.graph.create({
        data: {
          projectId: DEFAULT_PROJECT_ID,
          state: JSON.stringify(newState),
        },
      });
    }

    // Generate a summary of changes
    const assistantMessage = generateChangeSummary(delta);

    return NextResponse.json({
      assistantMessage,
      graphState: newState,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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

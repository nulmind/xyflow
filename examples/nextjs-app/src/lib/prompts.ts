import { GraphState } from './types';
import { LLMMessage } from './llm';

const SYSTEM_PROMPT = `You are a software architecture assistant that edits a graph representing a system design.
You receive the current architecture graph and a natural language request.
You MUST respond with a JSON object that conforms to the following TypeScript type:

interface GraphDelta {
  addNodes?: GraphNode[];
  updateNodes?: { id: string; label?: string; kind?: NodeKind; data?: Partial<GraphNode["data"]>; }[];
  removeNodeIds?: string[];
  addEdges?: GraphEdge[];
  removeEdgeIds?: string[];
}

interface GraphNode {
  id: string;
  kind: "service" | "class" | "module" | "api" | "queue" | "db";
  label: string;
  position: { x: number; y: number };
  data: { summary?: string; methods?: string[]; fields?: string[]; filePath?: string; };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: "calls" | "depends_on" | "publishes" | "consumes" | "queries";
  data?: { description?: string; };
}

Rules:
- Only include fields you are actually changing.
- Do not restate the full graph.
- Do not include any explanation or comments outside of the JSON.
- Ensure all added node IDs and edge IDs are unique (use descriptive kebab-case IDs like "auth-service", "user-db").
- Ensure that edges only reference existing or newly-added nodes.
- When adding nodes, use reasonable default positions. Spread new nodes out (e.g., x: 100, 300, 500... and y: 100, 250, 400...).
- Respond ONLY with valid JSON. No markdown code blocks, no explanations.`;

/**
 * Builds the messages array for the LLM request
 */
export function buildLLMMessages(userMessage: string, graphState: GraphState): LLMMessage[] {
  // Trim large graphs to avoid token limits
  const trimmedState = trimGraphStateForPrompt(graphState);

  const userContent = `Project context: This graph represents a system architecture with nodes and edges as described.

Current graph:
${JSON.stringify(trimmedState, null, 2)}

User request:
"${userMessage}"`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
}

/**
 * Trims graph state if it's too large for the context window
 */
function trimGraphStateForPrompt(state: GraphState): GraphState {
  const MAX_NODES = 50;
  const MAX_EDGES = 100;

  let nodes = state.nodes;
  let edges = state.edges;

  if (nodes.length > MAX_NODES) {
    console.warn(`Trimming nodes from ${nodes.length} to ${MAX_NODES}`);
    nodes = nodes.slice(0, MAX_NODES);
    // Keep only edges that reference the remaining nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }

  if (edges.length > MAX_EDGES) {
    console.warn(`Trimming edges from ${edges.length} to ${MAX_EDGES}`);
    edges = edges.slice(0, MAX_EDGES);
  }

  return {
    ...state,
    nodes,
    edges,
  };
}

/**
 * Generates a natural language summary of what changed based on the delta
 */
export function generateChangeSummary(delta: import('./types').GraphDelta): string {
  const parts: string[] = [];

  if (delta.addNodes && delta.addNodes.length > 0) {
    const labels = delta.addNodes.map(n => `"${n.label}" (${n.kind})`).join(', ');
    parts.push(`Added ${delta.addNodes.length} node(s): ${labels}`);
  }

  if (delta.updateNodes && delta.updateNodes.length > 0) {
    const ids = delta.updateNodes.map(n => n.id).join(', ');
    parts.push(`Updated ${delta.updateNodes.length} node(s): ${ids}`);
  }

  if (delta.removeNodeIds && delta.removeNodeIds.length > 0) {
    parts.push(`Removed ${delta.removeNodeIds.length} node(s): ${delta.removeNodeIds.join(', ')}`);
  }

  if (delta.addEdges && delta.addEdges.length > 0) {
    const edges = delta.addEdges.map(e => `${e.source} → ${e.target} (${e.kind})`).join(', ');
    parts.push(`Added ${delta.addEdges.length} edge(s): ${edges}`);
  }

  if (delta.removeEdgeIds && delta.removeEdgeIds.length > 0) {
    parts.push(`Removed ${delta.removeEdgeIds.length} edge(s): ${delta.removeEdgeIds.join(', ')}`);
  }

  if (parts.length === 0) {
    return 'No changes were made to the graph.';
  }

  return parts.join('. ') + '.';
}

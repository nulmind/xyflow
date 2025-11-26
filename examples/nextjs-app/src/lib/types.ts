import { z } from 'zod';

// Node kinds supported by the architecture graph
export const NodeKindSchema = z.enum(['service', 'class', 'module', 'api', 'queue', 'db']);
export type NodeKind = z.infer<typeof NodeKindSchema>;

// Edge kinds representing relationships between nodes
export const EdgeKindSchema = z.enum(['calls', 'depends_on', 'publishes', 'consumes', 'queries']);
export type EdgeKind = z.infer<typeof EdgeKindSchema>;

// Position for React Flow compatibility
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// GraphNode data schema
export const GraphNodeDataSchema = z.object({
  summary: z.string().optional(),
  methods: z.array(z.string()).optional(),
  fields: z.array(z.string()).optional(),
  filePath: z.string().optional(),
});

// Full GraphNode schema
export const GraphNodeSchema = z.object({
  id: z.string(),
  kind: NodeKindSchema,
  label: z.string(),
  position: PositionSchema,
  data: GraphNodeDataSchema,
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

// GraphEdge data schema
export const GraphEdgeDataSchema = z.object({
  description: z.string().optional(),
}).optional();

// Full GraphEdge schema
export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: EdgeKindSchema,
  data: GraphEdgeDataSchema,
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

// Graph metadata
export const GraphMetaSchema = z.object({
  projectId: z.string(),
  updatedAt: z.string(),
});

// Full GraphState schema
export const GraphStateSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  meta: GraphMetaSchema,
});
export type GraphState = z.infer<typeof GraphStateSchema>;

// GraphDelta for LLM responses - partial updates to the graph
export const NodeUpdateSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  kind: NodeKindSchema.optional(),
  data: GraphNodeDataSchema.partial().optional(),
});

export const GraphDeltaSchema = z.object({
  addNodes: z.array(GraphNodeSchema).optional(),
  updateNodes: z.array(NodeUpdateSchema).optional(),
  removeNodeIds: z.array(z.string()).optional(),
  addEdges: z.array(GraphEdgeSchema).optional(),
  removeEdgeIds: z.array(z.string()).optional(),
});
export type GraphDelta = z.infer<typeof GraphDeltaSchema>;

// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// API request/response types
export interface ChatRequest {
  message: string;
  graphState: GraphState;
}

export interface ChatResponse {
  assistantMessage: string;
  graphState: GraphState;
}

// Helper function to create a new empty graph state
export function createEmptyGraphState(projectId: string): GraphState {
  return {
    nodes: [],
    edges: [],
    meta: {
      projectId,
      updatedAt: new Date().toISOString(),
    },
  };
}

// Helper to generate unique IDs
export function generateId(prefix: string = 'node'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

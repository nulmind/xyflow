import { GraphState, GraphDelta, GraphNode, GraphEdge } from './types';

/**
 * Merges a GraphDelta into an existing GraphState
 * Returns a new GraphState with the delta applied
 */
export function mergeGraphDelta(state: GraphState, delta: GraphDelta): GraphState {
  let nodes = [...state.nodes];
  let edges = [...state.edges];

  // 1. Remove nodes first (this also removes orphan edges)
  if (delta.removeNodeIds && delta.removeNodeIds.length > 0) {
    const removeSet = new Set(delta.removeNodeIds);
    nodes = nodes.filter(n => !removeSet.has(n.id));
    // Remove edges that reference removed nodes
    edges = edges.filter(e => !removeSet.has(e.source) && !removeSet.has(e.target));
  }

  // 2. Remove edges
  if (delta.removeEdgeIds && delta.removeEdgeIds.length > 0) {
    const removeSet = new Set(delta.removeEdgeIds);
    edges = edges.filter(e => !removeSet.has(e.id));
  }

  // 3. Add new nodes
  if (delta.addNodes && delta.addNodes.length > 0) {
    // Ensure we don't add duplicate node IDs
    const existingIds = new Set(nodes.map(n => n.id));
    for (const newNode of delta.addNodes) {
      if (!existingIds.has(newNode.id)) {
        nodes.push(newNode);
        existingIds.add(newNode.id);
      }
    }
  }

  // 4. Update existing nodes
  if (delta.updateNodes && delta.updateNodes.length > 0) {
    const updateMap = new Map(delta.updateNodes.map(u => [u.id, u]));
    nodes = nodes.map(node => {
      const update = updateMap.get(node.id);
      if (!update) return node;

      return {
        ...node,
        label: update.label ?? node.label,
        kind: update.kind ?? node.kind,
        data: {
          ...node.data,
          ...update.data,
        },
      };
    });
  }

  // 5. Add new edges (only if source and target exist)
  if (delta.addEdges && delta.addEdges.length > 0) {
    const nodeIds = new Set(nodes.map(n => n.id));
    const existingEdgeIds = new Set(edges.map(e => e.id));

    for (const newEdge of delta.addEdges) {
      // Validate that source and target nodes exist
      if (nodeIds.has(newEdge.source) && nodeIds.has(newEdge.target)) {
        if (!existingEdgeIds.has(newEdge.id)) {
          edges.push(newEdge);
          existingEdgeIds.add(newEdge.id);
        }
      } else {
        console.warn(
          `Skipping edge ${newEdge.id}: source (${newEdge.source}) or target (${newEdge.target}) not found`
        );
      }
    }
  }

  return {
    nodes,
    edges,
    meta: {
      ...state.meta,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Validates that all edge references are valid
 */
export function validateGraphState(state: GraphState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set(state.nodes.map(n => n.id));

  // Check for duplicate node IDs
  const seenNodeIds = new Set<string>();
  for (const node of state.nodes) {
    if (seenNodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    seenNodeIds.add(node.id);
  }

  // Check for duplicate edge IDs
  const seenEdgeIds = new Set<string>();
  for (const edge of state.edges) {
    if (seenEdgeIds.has(edge.id)) {
      errors.push(`Duplicate edge ID: ${edge.id}`);
    }
    seenEdgeIds.add(edge.id);
  }

  // Check that all edges reference valid nodes
  for (const edge of state.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Auto-layout nodes in a simple grid pattern if they don't have positions
 */
export function autoLayoutNodes(nodes: GraphNode[], startX: number = 100, startY: number = 100): GraphNode[] {
  const SPACING_X = 250;
  const SPACING_Y = 150;
  const COLS = 4;

  return nodes.map((node, index) => {
    // If node already has a non-zero position, keep it
    if (node.position.x !== 0 || node.position.y !== 0) {
      return node;
    }

    const col = index % COLS;
    const row = Math.floor(index / COLS);

    return {
      ...node,
      position: {
        x: startX + col * SPACING_X,
        y: startY + row * SPACING_Y,
      },
    };
  });
}

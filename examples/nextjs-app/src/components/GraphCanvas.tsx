'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  addEdge,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ArchitectureNodeComponent, { type ArchitectureNodeData, type ArchitectureNode } from './ArchitectureNode';
import { GraphState, GraphNode, GraphEdge, EdgeKind } from '@/lib/types';

// Edge colors for different kinds
const edgeColors: Record<EdgeKind, string> = {
  calls: '#3b82f6',       // blue
  depends_on: '#8b5cf6',  // purple
  publishes: '#22c55e',   // green
  consumes: '#f59e0b',    // amber
  queries: '#ef4444',     // red
};

interface GraphCanvasProps {
  graphState: GraphState;
  onGraphChange: (newState: GraphState) => void;
}

// Custom node types
const nodeTypes = {
  architecture: ArchitectureNodeComponent,
};

export default function GraphCanvas({ graphState, onGraphChange }: GraphCanvasProps) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const graphStateRef = useRef(graphState);

  // Keep ref updated with latest graphState
  useEffect(() => {
    graphStateRef.current = graphState;
  }, [graphState]);

  // Handler for label changes from the custom node
  const handleLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      const currentState = graphStateRef.current;
      const updatedNodes = currentState.nodes.map((node) =>
        node.id === nodeId ? { ...node, label: newLabel } : node
      );
      const newState = {
        ...currentState,
        nodes: updatedNodes,
        meta: { ...currentState.meta, updatedAt: new Date().toISOString() },
      };
      onGraphChange(newState);
    },
    [onGraphChange]
  );

  // Convert GraphState to React Flow format
  const initialNodes: ArchitectureNode[] = useMemo(
    () =>
      graphState.nodes.map((node): ArchitectureNode => ({
        id: node.id,
        type: 'architecture',
        position: node.position,
        data: {
          label: node.label,
          kind: node.kind,
          summary: node.data.summary,
          methods: node.data.methods,
          fields: node.data.fields,
          filePath: node.data.filePath,
          onLabelChange: handleLabelChange,
        },
      })),
    [graphState.nodes, handleLabelChange]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      graphState.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.kind,
        labelStyle: { fontSize: 10, fill: '#666' },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 2,
        style: { stroke: edgeColors[edge.kind] || '#999', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColors[edge.kind] || '#999',
        },
        data: edge.data,
      })),
    [graphState.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when graphState changes externally
  useEffect(() => {
    setNodes(
      graphState.nodes.map((node): ArchitectureNode => ({
        id: node.id,
        type: 'architecture',
        position: node.position,
        data: {
          label: node.label,
          kind: node.kind,
          summary: node.data.summary,
          methods: node.data.methods,
          fields: node.data.fields,
          filePath: node.data.filePath,
          onLabelChange: handleLabelChange,
        },
      }))
    );
    setEdges(
      graphState.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.kind,
        labelStyle: { fontSize: 10, fill: '#666' },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 2,
        style: { stroke: edgeColors[edge.kind] || '#999', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColors[edge.kind] || '#999',
        },
        data: edge.data,
      }))
    );
  }, [graphState, setNodes, setEdges, handleLabelChange]);

  // Handle node position changes (debounced save)
  const handleNodesChange = useCallback(
    (changes: NodeChange<ArchitectureNode>[]) => {
      onNodesChange(changes);

      // Check if any position changes
      const hasPositionChange = changes.some(
        (change) => change.type === 'position' && change.position
      );

      if (hasPositionChange) {
        // Debounce the save
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
          // Get current node positions from React Flow state
          setNodes((currentNodes) => {
            const updatedGraphNodes: GraphNode[] = graphStateRef.current.nodes.map((gNode) => {
              const rfNode = currentNodes.find((n) => n.id === gNode.id);
              return rfNode
                ? { ...gNode, position: rfNode.position }
                : gNode;
            });

            const newState: GraphState = {
              ...graphStateRef.current,
              nodes: updatedGraphNodes,
              meta: {
                ...graphStateRef.current.meta,
                updatedAt: new Date().toISOString(),
              },
            };

            onGraphChange(newState);
            return currentNodes;
          });
        }, 500);
      }
    },
    [onNodesChange, onGraphChange, setNodes]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle new connections (optional, for creating edges via drag)
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `edge-${Date.now()}`,
        label: 'depends_on',
        style: { stroke: edgeColors.depends_on, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColors.depends_on,
        },
      } as Edge;

      setEdges((eds) => addEdge(newEdge, eds));

      // Also update the graph state
      const newGraphEdge: GraphEdge = {
        id: newEdge.id,
        source: connection.source!,
        target: connection.target!,
        kind: 'depends_on',
      };

      const newState: GraphState = {
        ...graphStateRef.current,
        edges: [...graphStateRef.current.edges, newGraphEdge],
        meta: {
          ...graphStateRef.current.meta,
          updatedAt: new Date().toISOString(),
        },
      };

      onGraphChange(newState);
    },
    [setEdges, onGraphChange]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const kind = (node.data as ArchitectureNodeData)?.kind || 'service';
            const colors: Record<string, string> = {
              service: '#3b82f6',
              class: '#8b5cf6',
              module: '#22c55e',
              api: '#f97316',
              queue: '#eab308',
              db: '#ef4444',
            };
            return colors[kind] || '#999';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}

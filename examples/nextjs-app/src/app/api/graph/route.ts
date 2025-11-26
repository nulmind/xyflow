import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { GraphState, GraphStateSchema, createEmptyGraphState } from '@/lib/types';
import { validateGraphState } from '@/lib/graph-utils';

const DEFAULT_PROJECT_ID = 'default-project';
const DEFAULT_PROJECT_NAME = 'Architecture Design';

/**
 * GET /api/graph
 * Returns the current GraphState from SQLite.
 * If none exists yet, creates a default empty graph.
 */
export async function GET() {
  try {
    // Ensure the default project exists
    let project = await prisma.project.findUnique({
      where: { id: DEFAULT_PROJECT_ID },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          id: DEFAULT_PROJECT_ID,
          name: DEFAULT_PROJECT_NAME,
        },
      });
    }

    // Get the latest graph for this project
    let graph = await prisma.graph.findFirst({
      where: { projectId: DEFAULT_PROJECT_ID },
      orderBy: { updatedAt: 'desc' },
    });

    let graphState: GraphState;

    if (!graph) {
      // Create a new empty graph
      graphState = createEmptyGraphState(DEFAULT_PROJECT_ID);

      graph = await prisma.graph.create({
        data: {
          projectId: DEFAULT_PROJECT_ID,
          state: JSON.stringify(graphState),
        },
      });
    } else {
      // Parse existing graph state
      try {
        graphState = JSON.parse(graph.state);
      } catch {
        // If parsing fails, create a new empty graph
        graphState = createEmptyGraphState(DEFAULT_PROJECT_ID);
      }
    }

    return NextResponse.json(graphState);
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/graph
 * Accepts a full GraphState and writes it to SQLite.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the incoming graph state
    const parseResult = GraphStateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid graph state', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const graphState = parseResult.data;

    // Additional validation for graph integrity
    const validation = validateGraphState(graphState);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid graph structure', details: validation.errors },
        { status: 400 }
      );
    }

    // Update the timestamp
    graphState.meta.updatedAt = new Date().toISOString();

    // Ensure project exists
    await prisma.project.upsert({
      where: { id: DEFAULT_PROJECT_ID },
      update: {},
      create: {
        id: DEFAULT_PROJECT_ID,
        name: DEFAULT_PROJECT_NAME,
      },
    });

    // Upsert the graph (find existing or create new)
    const existingGraph = await prisma.graph.findFirst({
      where: { projectId: DEFAULT_PROJECT_ID },
      orderBy: { updatedAt: 'desc' },
    });

    if (existingGraph) {
      await prisma.graph.update({
        where: { id: existingGraph.id },
        data: { state: JSON.stringify(graphState) },
      });
    } else {
      await prisma.graph.create({
        data: {
          projectId: DEFAULT_PROJECT_ID,
          state: JSON.stringify(graphState),
        },
      });
    }

    return NextResponse.json(graphState);
  } catch (error) {
    console.error('Error saving graph:', error);
    return NextResponse.json(
      { error: 'Failed to save graph' },
      { status: 500 }
    );
  }
}

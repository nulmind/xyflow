'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import ChatPanel from '@/components/ChatPanel';
import GraphCanvas from '@/components/GraphCanvas';
import DemoModeSettings from '@/components/DemoModeSettings';
import { GraphState, createEmptyGraphState } from '@/lib/types';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { getStorageAdapter } from '@/lib/storage';

export default function Home() {
  const [graphState, setGraphState] = useState<GraphState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check demo mode on mount
  useEffect(() => {
    setIsDemoMode(isDemoModeEnabled());
  }, []);

  // Load initial graph state
  useEffect(() => {
    async function loadGraph() {
      try {
        if (isDemoMode) {
          // Load from localStorage
          const storage = getStorageAdapter();
          const data = await storage.getGraphState();
          setGraphState(data);
        } else {
          // Load from backend API
          const response = await fetch('/api/graph');
          if (!response.ok) {
            throw new Error('Failed to load graph');
          }
          const data = await response.json();
          setGraphState(data);
        }
      } catch (err) {
        console.error('Error loading graph:', err);
        setError(
          isDemoMode
            ? 'Failed to load graph from storage. Using empty state.'
            : 'Failed to load graph from server. Using empty state.'
        );
        setGraphState(createEmptyGraphState('default-project'));
      } finally {
        setIsLoading(false);
      }
    }

    loadGraph();
  }, [isDemoMode]);

  // Save graph state (to localStorage or backend)
  const saveGraphState = useCallback(
    async (state: GraphState) => {
      try {
        if (isDemoMode) {
          // Save to localStorage
          const storage = getStorageAdapter();
          await storage.saveGraphState(state);
        } else {
          // Save to backend API
          const response = await fetch('/api/graph', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state),
          });

          if (!response.ok) {
            console.error('Failed to save graph');
          }
        }
      } catch (err) {
        console.error('Error saving graph:', err);
      }
    },
    [isDemoMode]
  );

  // Handle graph changes with debounced save
  const handleGraphChange = useCallback(
    (newState: GraphState) => {
      setGraphState(newState);

      // Debounce save to avoid too many requests during drag
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveGraphState(newState);
      }, 1000);
    },
    [saveGraphState]
  );

  // Handle graph update from chat
  const handleGraphUpdate = useCallback(
    (newState: GraphState) => {
      setGraphState(newState);
      // In demo mode, save immediately
      if (isDemoMode) {
        saveGraphState(newState);
      }
      // In backend mode, chat API already saves
    },
    [isDemoMode, saveGraphState]
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading architecture...</p>
        </div>
      </div>
    );
  }

  if (!graphState) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center text-red-500">
          <p>Failed to initialize graph state</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen flex overflow-hidden">
      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="absolute top-0 left-0 right-0 bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800 z-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">📱 Demo Mode</span>
            <span>- Data stored in browser only</span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            ⚙️ Settings
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className={`absolute left-0 right-0 bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 z-50 ${isDemoMode ? 'top-10' : 'top-0'}`}>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-yellow-600 hover:text-yellow-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Settings modal */}
      <DemoModeSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Left panel - Chat */}
      <div className="w-[400px] min-w-[350px] max-w-[500px] flex-shrink-0">
        <ChatPanel
          graphState={graphState}
          onGraphUpdate={handleGraphUpdate}
          isDemoMode={isDemoMode}
        />
      </div>

      {/* Right panel - Graph Canvas */}
      <div className="flex-1 h-full">
        <ReactFlowProvider>
          <GraphCanvas graphState={graphState} onGraphChange={handleGraphChange} />
        </ReactFlowProvider>
      </div>
    </main>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, GraphState, ChatResponse } from '@/lib/types';
import { getDemoLLMConfig } from '@/lib/demo-mode';
import { processChatClientSide } from '@/lib/client-chat';

// Welcome message content for different modes
const WELCOME_MESSAGE_DEMO =
  "Hello! I'm your architecture assistant running in demo mode. To use AI features, click the Settings button above to configure your OpenAI API key. You can still manually edit the diagram!";
const WELCOME_MESSAGE_NORMAL =
  'Hello! I\'m your architecture assistant. Describe the system you want to design, and I\'ll help you create a visual architecture diagram. Try something like: "Add an API Gateway that connects to a UserService and AuthService"';

interface ChatPanelProps {
  graphState: GraphState;
  onGraphUpdate: (newState: GraphState) => void;
  isDemoMode?: boolean;
}

export default function ChatPanel({
  graphState,
  onGraphUpdate,
  isDemoMode = false,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: isDemoMode ? WELCOME_MESSAGE_DEMO : WELCOME_MESSAGE_NORMAL,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const message = inputValue.trim();
      if (!message || isLoading) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);

      try {
        let assistantContent: string;
        let newGraphState: GraphState | undefined;

        if (isDemoMode) {
          // Client-side processing for demo mode
          const llmConfig = getDemoLLMConfig();

          if (!llmConfig.apiKey) {
            assistantContent =
              'Please configure your OpenAI API key in Settings to use AI features.';
          } else {
            try {
              const result = await processChatClientSide({
                message,
                graphState,
                llmConfig: {
                  apiKey: llmConfig.apiKey,
                  model: llmConfig.model,
                  baseUrl: llmConfig.baseUrl,
                },
              });

              assistantContent = result.assistantMessage;
              newGraphState = result.graphState;
            } catch (error) {
              assistantContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
        } else {
          // Server-side processing for normal mode
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              graphState,
            }),
          });

          const data: ChatResponse & { error?: string } = await response.json();
          assistantContent = data.assistantMessage || data.error || 'Something went wrong.';
          newGraphState = data.graphState;
        }

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update graph state if we got a new one
        if (newGraphState) {
          onGraphUpdate(newGraphState);
        }
      } catch (error) {
        console.error('Chat error:', error);
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, there was an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, isLoading, graphState, onGraphUpdate, isDemoMode]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Architecture Assistant</h2>
        <p className="text-xs text-gray-500">
          Describe your system design and I&apos;ll update the diagram
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] px-4 py-2 rounded-lg
                ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }
              `}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to add or modify..."
            disabled={isLoading}
            rows={2}
            className="
              flex-1 px-3 py-2 text-sm
              border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              resize-none
              disabled:bg-gray-50 disabled:text-gray-500
            "
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="
              px-4 py-2
              bg-blue-500 text-white font-medium rounded-lg
              hover:bg-blue-600
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:bg-gray-300 disabled:cursor-not-allowed
              transition-colors
            "
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useMessages } from '../../hooks/useDatabase';
import { runStrategy, StrategyStatus } from '../../services/strategyEngine';
import { OllamaService } from '../../services/ollama';
import { FormattedContentType, MarkdownBlockType } from '../../schema';
import { WelcomeMessage } from './WelcomeMessage';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ErrorBanner } from '../UI/ErrorBanner';
import { ConfirmationModal } from '../UI/ConfirmationModal';
import { StrategyStatusIndicator } from './StrategyStatusIndicator';

interface ChatInterfaceProps {
  chatId?: string;
  projectId: string;
}

export function ChatInterface({ chatId, projectId }: ChatInterfaceProps) {
  const { messages, addMessage, deleteMessage } = useMessages(chatId);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [strategyStatus, setStrategyStatus] = useState<StrategyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, strategyStatus]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStrategyStatusUpdate = (status: StrategyStatus) => {
    setStrategyStatus(status);
    
    // Clear status automatically when all tasks are completed or if there are errors
    const allCompleted = status.tasks.every(task => task.status === 'completed');
    const hasErrors = status.tasks.some(task => task.status === 'error');
    
    if (allCompleted && !hasErrors) {
      // Hide status after a short delay when everything is successful
      setTimeout(() => {
        setStrategyStatus(null);
        setStreamingContent('');
      }, 1500);
    } else if (hasErrors) {
      // Hide status after a longer delay when there are errors (let user see the error)
      setTimeout(() => {
        setStrategyStatus(null);
        setStreamingContent('');
      }, 5000);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!chatId || isLoading) return;

    setIsLoading(true);
    setError(null);
    setConnectionError(null);
    setStrategyStatus(null);

    try {
      // Create user message with structured content
      const userMessageContent: FormattedContentType = {
        type: 'formatted',
        blocks: [{
          type: 'markdown',
          text: userMessage
        } as MarkdownBlockType]
      };

      const newUserMessage = {
        id: crypto.randomUUID(),
        actor: 'user' as const,
        content: userMessageContent,
        timestamp: new Date(),
        chatId
      };

      // Add user message to database
      await addMessage(newUserMessage);

      // Prepare history for strategy
      const currentHistory = [...messages, newUserMessage];

      // Run strategy with status updates
      const strategyResponse = await runStrategy(
        currentHistory, 
        [], 
        handleStrategyStatusUpdate
      );

      // Add AI response to database
      await addMessage(strategyResponse);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Check if it's a connection-related error
      if (errorMessage.includes('Connection to AI service failed') ||
          errorMessage.includes('Unable to connect to the AI service') ||
          errorMessage.includes('AI service is currently unavailable') ||
          errorMessage.includes('Cross-origin request blocked') ||
          errorMessage.includes('Failed to fetch')) {
        setConnectionError(errorMessage);
      } else {
        setError(errorMessage);
      }
      
      // Add error message to chat
      const errorResponse = {
        id: crypto.randomUUID(),
        actor: 'llm' as const,
        content: {
          type: 'formatted',
          blocks: [{
            type: 'markdown',
            text: `I apologize, but I encountered an error: ${errorMessage}`
          } as MarkdownBlockType]
        } as FormattedContentType,
        timestamp: new Date(),
        chatId
      };

      await addMessage(errorResponse);
      setStreamingContent('');
      setStrategyStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleDeleteMessage = async (messageId: string) => {
    setDeletingMessageId(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (deletingMessageId) {
      await deleteMessage(deletingMessageId);
      setDeletingMessageId(null);
    }
  };

  const retryConnection = () => {
    setError(null);
    setConnectionError(null);
    setStrategyStatus(null);
    // Reset the Ollama service status to allow retrying
    OllamaService.resetServiceStatus();
  };

  // Only show strategy status if there are active tasks or recent errors
  const shouldShowStatus = strategyStatus && (
    strategyStatus.tasks.some(task => task.status === 'inProgress') ||
    strategyStatus.tasks.some(task => task.status === 'error') ||
    strategyStatus.retryAttempt
  );

  if (!chatId) {
    return <WelcomeMessage />;
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white via-cyan-25 to-purple-25">
      {/* Connection Error Banner */}
      {connectionError && (
        <ErrorBanner 
          message={`AI Service Connection Issue: ${connectionError}`} 
          onRetry={retryConnection}
          type="warning"
        />
      )}

      {/* General Error Banner */}
      {error && !connectionError && (
        <ErrorBanner message={error} onRetry={retryConnection} />
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        strategyStatus={shouldShowStatus ? strategyStatus : null}
        onCopyMessage={copyToClipboard}
        onDeleteMessage={handleDeleteMessage}
        messagesEndRef={messagesEndRef}
      />

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        disabled={!!connectionError}
      />

      <ConfirmationModal
        isOpen={!!deletingMessageId}
        onClose={() => setDeletingMessageId(null)}
        onConfirm={confirmDeleteMessage}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
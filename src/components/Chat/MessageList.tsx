import React from 'react';
import { User, Bot, Settings, Terminal, Info } from 'lucide-react';
import { Message } from '../../types';
import { StrategyStatus } from '../../services/strategyEngine';
import { MessageContent } from './MessageContent';
import { MessageActions } from './MessageActions';
import { StrategyStatusIndicator } from './StrategyStatusIndicator';

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  strategyStatus?: StrategyStatus | null;
  onCopyMessage: (content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({ 
  messages, 
  streamingContent, 
  strategyStatus,
  onCopyMessage, 
  onDeleteMessage, 
  messagesEndRef 
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCopy={onCopyMessage}
          onDelete={onDeleteMessage}
        />
      ))}
      
      {/* Strategy status or streaming message */}
      {(streamingContent || strategyStatus) && (
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg border-2 border-purple-200">
            {strategyStatus ? (
              <StrategyStatusIndicator status={strategyStatus} />
            ) : (
              <>
                <p className="text-purple-700 font-medium">{streamingContent}</p>
                <div className="w-3 h-6 bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse inline-block ml-1 rounded-full" />
              </>
            )}
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onCopy: (content: string) => void;
  onDelete: (messageId: string) => void;
}

function MessageBubble({ message, onCopy, onDelete }: MessageBubbleProps) {
  const isUser = message.actor === 'user';
  
  const getMessageConfig = (actor: Message['actor']) => {
    switch (actor) {
      case 'user':
        return {
          icon: User,
          avatarBg: 'bg-gradient-to-r from-teal-400 to-cyan-400',
          bubbleBg: 'bg-gradient-to-r from-teal-50 to-cyan-50',
          border: 'border-teal-200',
          name: 'You'
        };
      case 'llm':
        return {
          icon: Bot,
          avatarBg: 'bg-gradient-to-r from-purple-400 to-pink-400',
          bubbleBg: 'bg-gradient-to-r from-purple-50 to-pink-50',
          border: 'border-purple-200',
          name: 'Assistant'
        };
      case 'agent':
        return {
          icon: Settings,
          avatarBg: 'bg-gradient-to-r from-orange-400 to-red-400',
          bubbleBg: 'bg-gradient-to-r from-orange-50 to-red-50',
          border: 'border-orange-200',
          name: 'Agent'
        };
      case 'tool':
        return {
          icon: Terminal,
          avatarBg: 'bg-gradient-to-r from-green-400 to-emerald-400',
          bubbleBg: 'bg-gradient-to-r from-green-50 to-emerald-50',
          border: 'border-green-200',
          name: 'Tool'
        };
      default:
        return {
          icon: Bot,
          avatarBg: 'bg-gradient-to-r from-purple-400 to-pink-400',
          bubbleBg: 'bg-gradient-to-r from-purple-50 to-pink-50',
          border: 'border-purple-200',
          name: 'Assistant'
        };
    }
  };

  const config = getMessageConfig(message.actor);
  const IconComponent = config.icon;

  if (isUser) {
    // User messages: Right-aligned layout
    return (
      <div className="flex items-start space-x-4 group flex-row-reverse">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${config.avatarBg} text-white`}>
          <IconComponent className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 flex flex-col items-end">
          <div className={`rounded-2xl p-6 shadow-lg border-2 max-w-[80%] ${config.bubbleBg} ${config.border}`}>
            <MessageContent content={message.content} isUser={isUser} />
          </div>

          <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageActions
              onCopy={onCopy}
              onDelete={onDelete}
              timestamp={message.timestamp}
              messageContent={message.content}
              messageId={message.id}
              isUser={isUser}
            />
          </div>
        </div>
      </div>
    );
  }

  // Non-user messages: Left-aligned layout
  return (
    <div className="flex items-start space-x-4 group">
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${config.avatarBg} text-white`}>
        <IconComponent className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-semibold text-gray-600">{config.name}</span>
          <span className="text-xs text-gray-400">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        
        <div className={`rounded-2xl p-6 shadow-lg border-2 ${config.bubbleBg} ${config.border}`}>
          <MessageContent content={message.content} isUser={isUser} />
        </div>

        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageActions
            onCopy={onCopy}
            onDelete={onDelete}
            timestamp={message.timestamp}
            messageContent={message.content}
            messageId={message.id}
            isUser={isUser}
          />
        </div>
      </div>
    </div>
  );
}
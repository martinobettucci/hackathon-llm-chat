import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { StrategyContentType } from '../../schema';

interface MessageActionsProps {
  onCopy: (content: string) => void;
  onDelete: (messageId: string) => void;
  timestamp: Date;
  messageContent: StrategyContentType;
  messageId: string;
  isUser?: boolean;
}

export function MessageActions({ 
  onCopy, 
  onDelete, 
  timestamp, 
  messageContent, 
  messageId, 
  isUser = false 
}: MessageActionsProps) {
  const getContentText = (content: StrategyContentType): string => {
    if (content.type === 'formatted') {
      return content.blocks
        .map(block => block.type === 'markdown' ? block.text : block.code)
        .join('\n\n');
    } else if (content.type === 'toolCall') {
      return content.display;
    }
    return '';
  };

  return (
    <div className={`flex items-center space-x-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <Button
        variant="secondary"
        size="sm"
        icon={Copy}
        onClick={() => onCopy(getContentText(messageContent))}
        className="h-8 px-3"
      >
        Copy
      </Button>
      <Button
        variant="danger"
        size="sm"
        icon={Trash2}
        onClick={() => onDelete(messageId)}
        className="h-8 px-3"
      >
        Delete
      </Button>
    </div>
  );
}
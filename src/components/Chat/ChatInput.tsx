import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../UI/Button';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, isLoading, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate the new height based on scroll height
      const newHeight = Math.min(textarea.scrollHeight, 160); // Max height of 160px (about 4 lines)
      textarea.style.height = `${newHeight}px`;
      
      // Ensure minimum height
      if (newHeight < 56) {
        textarea.style.height = '56px';
      }
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;

    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="border-t-2 border-gradient-to-r from-teal-200 to-purple-200 p-6 bg-white">
      <form onSubmit={handleSubmit} className="flex items-end space-x-4">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "⚠️ Connection issue - fix connection to continue" : "✨ Type your message... (Shift+Enter for new line)"}
            className={`
              w-full px-6 py-4 pr-16 border-2 rounded-2xl
              focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-400
              resize-none overflow-hidden shadow-lg text-lg leading-6
              transition-all duration-200 ease-out
              ${disabled 
                ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'border-gradient-to-r from-teal-300 to-purple-300 bg-gradient-to-r from-white to-cyan-50 text-gray-800 placeholder-gray-500'
              }
            `}
            style={{ 
              minHeight: '56px',
              maxHeight: '160px',
              height: '56px'
            }}
            disabled={isLoading || disabled}
          />
          <div className="absolute right-3 bottom-3">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Send}
              disabled={!input.trim() || isLoading || disabled}
              loading={isLoading}
              className="shadow-xl"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
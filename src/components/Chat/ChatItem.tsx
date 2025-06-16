import React from 'react';
import { MessageCircle, Edit3, Trash2 } from 'lucide-react';
import { Chat } from '../../types';
import { Button } from '../UI/Button';
import { formatDate } from '../../utils/formatters';

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  onSelect: (chatId: string) => void;
  onDelete: (chat: Chat) => void;
  onEdit: (chat: Chat) => void;
  onSaveEdit: (chatId: string) => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  editTitleValue: string;
  onEditTitleChange: (value: string) => void;
}

export function ChatItem({ 
  chat, 
  isSelected, 
  onSelect, 
  onDelete, 
  onEdit, 
  onSaveEdit, 
  onCancelEdit,
  isEditing,
  editTitleValue,
  onEditTitleChange
}: ChatItemProps) {
  return (
    <div
      className={`
        group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg border-2
        ${isSelected
          ? 'bg-gradient-to-r from-teal-100 to-cyan-100 border-teal-300 text-teal-800 transform scale-105'
          : 'bg-white border-gray-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-300 text-gray-700'
        }
      `}
      onClick={() => onSelect(chat.id)}
    >
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <MessageCircle className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editTitleValue}
                onChange={(e) => onEditTitleChange(e.target.value)}
                onBlur={() => onSaveEdit(chat.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSaveEdit(chat.id);
                  } else if (e.key === 'Escape') {
                    onCancelEdit();
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-white border-2 border-teal-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 shadow-sm"
                autoFocus
              />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold truncate">{chat.title}</p>
              <p className="text-xs opacity-75">
                {formatDate(chat.updatedAt)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="secondary"
          size="sm"
          icon={Edit3}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(chat);
          }}
          className="h-8 px-3"
        >
          Edit
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={Trash2}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat);
          }}
          className="h-8 px-3"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
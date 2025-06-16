import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useChats } from '../../hooks/useDatabase';
import { Chat } from '../../types';
import { Button } from '../UI/Button';
import { EmptyState } from '../UI/EmptyState';
import { GradientText } from '../UI/GradientText';
import { ConfirmationModal } from '../UI/ConfirmationModal';
import { ChatItem } from './ChatItem';

interface ChatListProps {
  projectId?: string;
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatList({ projectId, selectedChatId, onSelectChat, onNewChat }: ChatListProps) {
  const { chats, deleteChat, updateChat } = useChats(projectId);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingChat, setDeletingChat] = useState<Chat | null>(null);

  const handleDeleteChat = async (chat: Chat) => {
    setDeletingChat(chat);
  };

  const confirmDeleteChat = async () => {
    if (deletingChat) {
      await deleteChat(deletingChat.id);
      setDeletingChat(null);
    }
  };

  const handleEditTitle = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveTitle = async (chatId: string) => {
    if (editTitle.trim()) {
      await updateChat(chatId, { title: editTitle.trim() });
    }
    setEditingChatId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditTitle('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">
          <GradientText from="teal-600" to="purple-600">
            💬 Your Chats
          </GradientText>
        </h2>
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={onNewChat}
          className="shadow-lg"
        >
          New Chat
        </Button>
      </div>

      <div className="space-y-3">
        {chats.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No chats yet!"
            description="Start your first conversation ✨"
          />
        ) : (
          chats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChatId === chat.id}
              onSelect={onSelectChat}
              onDelete={handleDeleteChat}
              onEdit={handleEditTitle}
              onSaveEdit={handleSaveTitle}
              onCancelEdit={handleCancelEdit}
              isEditing={editingChatId === chat.id}
              editTitleValue={editTitle}
              onEditTitleChange={setEditTitle}
            />
          ))
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deletingChat}
        onClose={() => setDeletingChat(null)}
        onConfirm={confirmDeleteChat}
        title="Delete Chat"
        message={`Are you sure you want to delete "${deletingChat?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
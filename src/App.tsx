import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { ChatInterface } from './components/Chat/ChatInterface';
import { KnowledgeBase } from './components/KnowledgeBase/KnowledgeBase';
import { OllamaSettingsModal } from './components/Settings/OllamaSettingsModal';
import { useChats } from './hooks/useDatabase';

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('default');
  const [selectedChatId, setSelectedChatId] = useState<string>();
  const [activeView, setActiveView] = useState<'chat' | 'knowledge'>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Centralize all chat management in App component
  const { chats, createChat, updateChat, deleteChat, refreshChats } = useChats(selectedProjectId);

  const handleNewChat = async () => {
    try {
      const newChat = await createChat('New Chat', selectedProjectId);
      setSelectedChatId(newChat.id);
      setActiveView('chat');
      // Force refresh to ensure UI is updated immediately
      await refreshChats();
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedChatId(undefined);
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setActiveView('chat');
  };

  const handleViewChange = (view: 'chat' | 'knowledge') => {
    setActiveView(view);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleUpdateChat = async (chatId: string, updates: Partial<{ title: string }>) => {
    try {
      await updateChat(chatId, updates);
      // Refresh chat list to show updated data
      await refreshChats();
    } catch (error) {
      console.error('Error updating chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      // If the deleted chat was selected, clear selection
      if (selectedChatId === chatId) {
        setSelectedChatId(undefined);
      }
      // Refresh chat list to show updated data
      await refreshChats();
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex">
      <Sidebar
        selectedProjectId={selectedProjectId}
        selectedChatId={selectedChatId}
        chats={chats}
        onSelectProject={handleSelectProject}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onUpdateChat={handleUpdateChat}
        onDeleteChat={handleDeleteChat}
        activeView={activeView}
        onViewChange={handleViewChange}
        onOpenSettings={handleOpenSettings}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeView === 'chat' ? (
          <ChatInterface
            chatId={selectedChatId}
            projectId={selectedProjectId}
          />
        ) : (
          <KnowledgeBase projectId={selectedProjectId} />
        )}
      </div>

      {/* Settings Modal - rendered at app level to avoid sidebar constraints */}
      <OllamaSettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />
    </div>
  );
}

export default App;
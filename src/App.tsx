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
  const { createChat } = useChats();

  const handleNewChat = async () => {
    try {
      const newChat = await createChat('New Chat', selectedProjectId);
      setSelectedChatId(newChat.id);
      setActiveView('chat');
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

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex">
      <Sidebar
        selectedProjectId={selectedProjectId}
        selectedChatId={selectedChatId}
        onSelectProject={handleSelectProject}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
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
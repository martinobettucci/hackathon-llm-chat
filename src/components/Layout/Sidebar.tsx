import React, { useState } from 'react';
import { Menu, MessageCircle, Book } from 'lucide-react';
import { ProjectList } from '../Projects/ProjectList';
import { ChatList } from '../Chat/ChatList';
import { Button } from '../UI/Button';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNavButton } from './SidebarNavButton';

interface SidebarProps {
  selectedProjectId?: string;
  selectedChatId?: string;
  onSelectProject: (projectId: string) => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  activeView: 'chat' | 'knowledge';
  onViewChange: (view: 'chat' | 'knowledge') => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  selectedProjectId,
  selectedChatId,
  onSelectProject,
  onSelectChat,
  onNewChat,
  activeView,
  onViewChange,
  onOpenSettings
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 z-50 h-full bg-gradient-to-b from-white via-cyan-50 to-teal-50 border-r-4 border-gradient-to-b from-cyan-200 to-teal-300
        transition-transform duration-300 lg:relative lg:translate-x-0
        ${isCollapsed ? '-translate-x-full' : 'translate-x-0'}
        w-80 lg:w-80 shadow-xl
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <SidebarHeader 
            onClose={() => setIsCollapsed(true)}
            onOpenSettings={onOpenSettings}
          />

          {/* Navigation */}
          <div className="flex border-b-2 border-teal-200 bg-white">
            <SidebarNavButton
              label="💬 Chat"
              icon={MessageCircle}
              isActive={activeView === 'chat'}
              onClick={() => onViewChange('chat')}
              activeColor="bg-gradient-to-r from-teal-500 to-cyan-500"
              hoverColor="text-teal-700 hover:text-teal-900 hover:bg-teal-50"
            />
            <SidebarNavButton
              label="📚 Knowledge"
              icon={Book}
              isActive={activeView === 'knowledge'}
              onClick={() => onViewChange('knowledge')}
              activeColor="bg-gradient-to-r from-purple-500 to-pink-500"
              hoverColor="text-purple-700 hover:text-purple-900 hover:bg-purple-50"
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Projects */}
            <div className="p-4 border-b-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
              <ProjectList
                selectedProjectId={selectedProjectId}
                onSelectProject={onSelectProject}
              />
            </div>

            {/* Chat List (only shown in chat view) */}
            {activeView === 'chat' && (
              <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-cyan-25 to-white">
                <ChatList
                  projectId={selectedProjectId}
                  selectedChatId={selectedChatId}
                  onSelectChat={onSelectChat}
                  onNewChat={onNewChat}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile toggle button */}
      {isCollapsed && (
        <Button
          variant="primary"
          size="sm"
          icon={Menu}
          onClick={() => setIsCollapsed(false)}
          className="fixed top-4 left-4 z-40 lg:hidden bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
        />
      )}
    </>
  );
}
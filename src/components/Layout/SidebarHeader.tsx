import React from 'react';
import { X, Settings } from 'lucide-react';
import { GradientText } from '../UI/GradientText';
import { Button } from '../UI/Button';

interface SidebarHeaderProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

export function SidebarHeader({ onClose, onOpenSettings }: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b-2 border-orange-200 bg-gradient-to-r from-orange-100 to-pink-100">
      <h1 className="text-2xl font-bold">
        <GradientText from="purple-600" to="pink-600">
          🚀 Hackathon Chat
        </GradientText>
      </h1>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="secondary"
          size="sm"
          icon={Settings}
          onClick={onOpenSettings}
          className="h-8 w-8 p-0"
          title="Configuration Ollama"
        />
        <Button
          variant="secondary"
          size="sm"
          icon={X}
          onClick={onClose}
          className="lg:hidden h-8 w-8 p-0"
        />
      </div>
    </div>
  );
}
import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface SidebarNavButtonProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  activeColor: string;
  hoverColor: string;
}

export function SidebarNavButton({ 
  label, 
  icon: Icon, 
  isActive, 
  onClick, 
  activeColor, 
  hoverColor 
}: SidebarNavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center space-x-2 py-4 px-4 text-sm font-semibold transition-all duration-200
        ${isActive
          ? `text-white ${activeColor} shadow-lg`
          : `${hoverColor}`
        }
      `}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
}
import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm" onClick={onClose} />
        
        <div className={`relative bg-white rounded-3xl shadow-2xl w-full ${sizeClasses[size]} border-4 border-gradient-to-r from-teal-200 to-purple-200`}>
          <div className="flex items-center justify-between p-6 border-b-2 border-gradient-to-r from-teal-200 to-purple-200 bg-gradient-to-r from-teal-50 to-purple-50 rounded-t-3xl">
            <h3 className="text-xl font-bold text-transparent bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text">{title}</h3>
            <Button variant="secondary" size="sm" onClick={onClose} icon={X} className="text-gray-600 hover:text-gray-800" />
          </div>
          
          <div className="p-6 bg-gradient-to-br from-white to-purple-25">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
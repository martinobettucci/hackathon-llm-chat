import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  className?: string;
}

export function EmptyState({ icon, title, description, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 bg-gradient-to-r from-cyan-50 to-purple-50 rounded-2xl border-2 border-dashed border-cyan-300 ${className}`}>
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-lg font-medium text-gray-600 mb-2">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
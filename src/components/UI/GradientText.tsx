import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  from?: string;
  to?: string;
  className?: string;
}

export function GradientText({ 
  children, 
  from = 'teal-600', 
  to = 'purple-600', 
  className = '' 
}: GradientTextProps) {
  return (
    <span className={`text-transparent bg-gradient-to-r from-${from} to-${to} bg-clip-text ${className}`}>
      {children}
    </span>
  );
}
import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  children: React.ReactNode;
  inline?: boolean;
  className?: string;
  isUser?: boolean;
}

export function CodeBlock({ children, inline, className, isUser = false }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || '');
  
  if (!inline && match) {
    return (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  }

  return (
    <code className={`
      px-2 py-1 rounded-lg text-sm font-mono shadow-sm
      ${isUser 
        ? 'bg-teal-100 text-teal-800' 
        : 'bg-purple-100 text-purple-800'
      }
    `}>
      {children}
    </code>
  );
}
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { StrategyContentType } from '../../schema';
import { CodeBlock } from '../UI/CodeBlock';

interface MessageContentProps {
  content: StrategyContentType;
  isUser: boolean;
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  if (content.type === 'formatted') {
    return (
      <div className="space-y-4">
        {content.blocks.map((block, index) => {
          if (block.type === 'markdown') {
            return (
              <ReactMarkdown
                key={index}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    return (
                      <CodeBlock 
                        inline={inline} 
                        className={className} 
                        isUser={isUser}
                        {...props}
                      >
                        {children}
                      </CodeBlock>
                    );
                  }
                }}
              >
                {block.text}
              </ReactMarkdown>
            );
          } else if (block.type === 'code') {
            return (
              <CodeBlock
                key={index}
                inline={false}
                className={`language-${block.language || 'text'}`}
                isUser={isUser}
              >
                {block.code}
              </CodeBlock>
            );
          }
          return null;
        })}
      </div>
    );
  } else if (content.type === 'toolCall') {
    return (
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-blue-600 font-semibold">🔧 Tool Call</span>
            <span className="text-blue-500 text-sm">{content.name}</span>
          </div>
          <div className="text-sm text-blue-700">
            <strong>Parameters:</strong>
            <pre className="mt-1 text-xs bg-blue-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(content.params, null, 2)}
            </pre>
          </div>
        </div>
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              return (
                <CodeBlock 
                  inline={inline} 
                  className={className} 
                  isUser={isUser}
                  {...props}
                >
                  {children}
                </CodeBlock>
              );
            }
          }}
        >
          {content.display}
        </ReactMarkdown>
      </div>
    );
  }

  return null;
}
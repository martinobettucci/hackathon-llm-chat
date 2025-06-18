import React from 'react';
import { Link, FileText, Eye, Trash2, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { KnowledgeBaseItem } from '../../types';
import { Button } from '../UI/Button';
import { formatFileSize } from '../../utils/formatters';

interface KnowledgeBaseItemCardProps {
  item: KnowledgeBaseItem;
  onDelete: (item: KnowledgeBaseItem) => void;
  onPreview: (item: KnowledgeBaseItem) => void;
  onRegenerateEmbeddings?: (item: KnowledgeBaseItem) => void;
  isRegenerating?: boolean;
}

export function KnowledgeBaseItemCard({ 
  item, 
  onDelete, 
  onPreview, 
  onRegenerateEmbeddings,
  isRegenerating = false
}: KnowledgeBaseItemCardProps) {
  const hasEmbeddings = item.embeddings && item.embeddings.length > 0;
  const hasContent = item.content && item.content.trim().length > 0;

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-200 p-6 hover:shadow-xl transition-all duration-300 hover:border-purple-400 hover:-translate-y-1 flex flex-col h-full">
      <div className="flex items-start space-x-3 mb-4 flex-1">
        <div className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100">
          {item.type === 'url' && <Link className="w-5 h-5 text-blue-600" />}
          {item.type === 'document' && <FileText className="w-5 h-5 text-green-600" />}
          {item.type === 'text' && <FileText className="w-5 h-5 text-purple-600" />}
        </div>
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 leading-tight">
            {item.title}
          </h3>
          
          {item.type === 'url' && item.url && (
            <div className="mb-2 overflow-hidden">
              <p className="text-sm text-blue-600 line-clamp-1 break-all">
                {item.url}
              </p>
            </div>
          )}
          
          {item.type === 'document' && (
            <div className="flex flex-col space-y-1 text-sm text-gray-500 mb-2">
              <span className="line-clamp-1 break-all">{item.fileName}</span>
              {item.fileSize && (
                <span className="text-xs flex-shrink-0">📊 {formatFileSize(item.fileSize)}</span>
              )}
            </div>
          )}
          
          {item.content && hasContent && (
            <div className="mt-2 overflow-hidden">
              <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed break-words">
                {item.content}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom section with date and status */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-purple-100">
        <p className="text-xs text-gray-400 font-medium flex-shrink-0">
          📅 {item.createdAt.toLocaleDateString()}
        </p>
        
        {/* Embeddings status indicator */}
        <div className={`
          flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0
          ${hasEmbeddings 
            ? 'bg-green-100 text-green-800' 
            : hasContent 
              ? 'bg-orange-100 text-orange-800' 
              : 'bg-gray-100 text-gray-600'
          }
        `}>
          {hasEmbeddings && (
            <>
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
              <span className="whitespace-nowrap">AI Ready</span>
            </>
          )}
          {!hasEmbeddings && hasContent && (
            <>
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span className="whitespace-nowrap">No Embeddings</span>
            </>
          )}
          {!hasEmbeddings && !hasContent && (
            <>
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span className="whitespace-nowrap">No Content</span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-purple-100 mt-3">
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            onClick={() => onPreview(item)}
            className="h-8 px-3"
            disabled={isRegenerating}
          >
            View
          </Button>
          
          {/* Regenerate embeddings button - only show if there's content but no embeddings */}
          {hasContent && !hasEmbeddings && onRegenerateEmbeddings && (
            <Button
              variant="primary"
              size="sm"
              icon={Zap}
              onClick={() => onRegenerateEmbeddings(item)}
              className="h-8 px-3"
              title="Generate AI embeddings for search"
              disabled={isRegenerating}
              loading={isRegenerating}
            >
              {isRegenerating ? 'Processing...' : 'Generate AI'}
            </Button>
          )}
        </div>
        
        <Button
          variant="danger"
          size="sm"
          icon={Trash2}
          onClick={() => onDelete(item)}
          className="h-8 px-3"
          disabled={isRegenerating}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
import React from 'react';
import { Link, FileText, Eye, Trash2 } from 'lucide-react';
import { KnowledgeBaseItem } from '../../types';
import { Button } from '../UI/Button';
import { formatFileSize } from '../../utils/formatters';

interface KnowledgeBaseItemCardProps {
  item: KnowledgeBaseItem;
  onDelete: (item: KnowledgeBaseItem) => void;
  onPreview: (item: KnowledgeBaseItem) => void;
}

export function KnowledgeBaseItemCard({ item, onDelete, onPreview }: KnowledgeBaseItemCardProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-purple-200 p-6 hover:shadow-xl transition-all duration-300 hover:border-purple-400 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100">
            {item.type === 'url' && <Link className="w-5 h-5 text-blue-600" />}
            {item.type === 'document' && <FileText className="w-5 h-5 text-green-600" />}
            {item.type === 'text' && <FileText className="w-5 h-5 text-purple-600" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-800 truncate mb-1">
              {item.title}
            </h3>
            
            {item.type === 'url' && item.url && (
              <p className="text-sm text-blue-600 truncate">
                {item.url}
              </p>
            )}
            
            {item.type === 'document' && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{item.fileName}</span>
                {item.fileSize && <span>• {formatFileSize(item.fileSize)}</span>}
              </div>
            )}
            
            {item.content && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                {item.content.substring(0, 120)}...
              </p>
            )}
            
            <p className="text-xs text-gray-400 mt-3 font-medium">
              📅 {item.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-purple-100">
        <Button
          variant="secondary"
          size="sm"
          icon={Eye}
          onClick={() => onPreview(item)}
          className="h-8 px-3"
        >
          View
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={Trash2}
          onClick={() => onDelete(item)}
          className="h-8 px-3"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
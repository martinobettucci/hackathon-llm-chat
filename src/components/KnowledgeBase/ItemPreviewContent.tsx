import React from 'react';
import { Link, FileText } from 'lucide-react';
import { KnowledgeBaseItem } from '../../types';
import { formatFileSize } from '../../utils/formatters';

interface ItemPreviewContentProps {
  item: KnowledgeBaseItem;
}

export function ItemPreviewContent({ item }: ItemPreviewContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 text-sm text-gray-600 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
        {item.type === 'url' && <Link className="w-5 h-5 text-blue-600" />}
        {item.type === 'document' && <FileText className="w-5 h-5 text-green-600" />}
        {item.type === 'text' && <FileText className="w-5 h-5 text-purple-600" />}
        <span className="capitalize font-semibold">{item.type}</span>
        <span>•</span>
        <span>📅 {item.createdAt.toLocaleDateString()}</span>
      </div>

      {item.url && (
        <div>
          <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-700 to-purple-700 bg-clip-text mb-2">
            🔗 URL
          </label>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm break-all bg-blue-50 p-3 rounded-xl block hover:bg-blue-100 transition-colors"
          >
            {item.url}
          </a>
        </div>
      )}

      {item.content && (
        <div>
          <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-700 to-purple-700 bg-clip-text mb-2">
            📝 Content
          </label>
          <div className="max-h-96 overflow-y-auto bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-medium">
              {item.content}
            </pre>
          </div>
        </div>
      )}

      {item.type === 'document' && (
        <div className="grid grid-cols-2 gap-6 text-sm bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-xl">
          {item.fileName && (
            <div>
              <label className="block font-semibold text-green-700 mb-1">
                📄 File Name
              </label>
              <span className="text-gray-700">{item.fileName}</span>
            </div>
          )}
          {item.fileSize && (
            <div>
              <label className="block font-semibold text-green-700 mb-1">
                📊 File Size
              </label>
              <span className="text-gray-700">
                {formatFileSize(item.fileSize)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
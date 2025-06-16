import React from 'react';
import { Search, Upload, Plus } from 'lucide-react';
import { GradientText } from '../UI/GradientText';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';

interface KnowledgeBaseHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onFileUpload: (files: FileList) => void;
  onAddItemClick: () => void;
}

export function KnowledgeBaseHeader({ 
  searchQuery, 
  onSearchChange, 
  onFileUpload, 
  onAddItemClick 
}: KnowledgeBaseHeaderProps) {
  return (
    <div className="p-6 border-b-4 border-gradient-to-r from-purple-200 to-pink-200 bg-gradient-to-r from-white to-purple-50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          <GradientText from="purple-600" to="pink-600">
            📚 Knowledge Base
          </GradientText>
        </h2>
        <div className="flex items-center space-x-3">
          <input
            type="file"
            multiple
            onChange={(e) => e.target.files && onFileUpload(e.target.files)}
            className="hidden"
            id="file-upload"
            accept=".txt,.md,.pdf,.doc,.docx"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={Upload}
            onClick={() => document.getElementById('file-upload')?.click()}
            className="shadow-lg"
          >
            📄 Upload
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={onAddItemClick}
            className="shadow-lg"
          >
            ✨ Add Item
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="🔍 Search your knowledge base..."
          className="pl-12 text-lg"
        />
      </div>
    </div>
  );
}
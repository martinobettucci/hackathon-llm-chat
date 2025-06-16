import React, { useState } from 'react';
import { Link, FileText } from 'lucide-react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';

interface AddItemFormProps {
  onSubmit: (type: 'url' | 'text', title: string, urlOrContent: string) => void;
  onCancel: () => void;
}

export function AddItemForm({ onSubmit, onCancel }: AddItemFormProps) {
  const [type, setType] = useState<'url' | 'text'>('url');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'url' && url.trim() && title.trim()) {
      onSubmit('url', title.trim(), url.trim());
    } else if (type === 'text' && title.trim() && content.trim()) {
      onSubmit('text', title.trim(), content.trim());
    }
    
    // Reset form
    setTitle('');
    setUrl('');
    setContent('');
    setType('url');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex space-x-3 mb-6">
        <Button
          type="button"
          variant={type === 'url' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setType('url')}
          icon={Link}
          className="flex-1"
        >
          🔗 URL
        </Button>
        <Button
          type="button"
          variant={type === 'text' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setType('text')}
          icon={FileText}
          className="flex-1"
        >
          📝 Text
        </Button>
      </div>

      <Input
        label="✨ Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter a catchy title..."
        required
      />

      {type === 'url' ? (
        <Input
          label="🔗 URL"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://awesome-website.com"
          required
        />
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-700 to-purple-700 bg-clip-text">
            📝 Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your amazing content here..."
            rows={8}
            required
            className="
              block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm
              placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-400
              bg-gradient-to-r from-white to-cyan-25 text-gray-800 font-medium
              transition-all duration-200 hover:shadow-md
            "
          />
        </div>
      )}

      <div className="flex justify-end space-x-4 pt-6">
        <Button type="button" variant="secondary" onClick={onCancel} className="px-6">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!title.trim() || (type === 'url' ? !url.trim() : !content.trim())}
          className="px-8"
        >
          ✨ Add Item
        </Button>
      </div>
    </form>
  );
}
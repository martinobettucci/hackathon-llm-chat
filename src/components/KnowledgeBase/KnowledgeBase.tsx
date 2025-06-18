import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useKnowledgeBase } from '../../hooks/useDatabase';
import { KnowledgeBaseItem } from '../../types';
import { Modal } from '../UI/Modal';
import { EmptyState } from '../UI/EmptyState';
import { ConfirmationModal } from '../UI/ConfirmationModal';
import { KnowledgeBaseHeader } from './KnowledgeBaseHeader';
import { KnowledgeBaseItemCard } from './KnowledgeBaseItemCard';
import { AddItemForm } from './AddItemForm';
import { ItemPreviewContent } from './ItemPreviewContent';

interface KnowledgeBaseProps {
  projectId: string;
}

export function KnowledgeBase({ projectId }: KnowledgeBaseProps) {
  const { items, addItem, deleteItem, regenerateEmbeddings } = useKnowledgeBase(projectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<KnowledgeBaseItem | null>(null);
  const [regeneratingItem, setRegeneratingItem] = useState<string | null>(null);
  
  // Global processing states
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const [globalProcessingMessage, setGlobalProcessingMessage] = useState('');

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddItem = async (type: 'url' | 'text', title: string, url?: string, content?: string) => {
    setIsGlobalProcessing(true);
    setGlobalProcessingMessage('🤖 Processing with AI...');
    
    try {
      if (type === 'url') {
        setGlobalProcessingMessage('🔗 Processing URL content...');
        await addItem({
          projectId,
          type: 'url',
          title,
          url: url || '',
          content: content || undefined
        });
      } else {
        setGlobalProcessingMessage('📝 Processing text content...');
        await addItem({
          projectId,
          type: 'text',
          title,
          content: content || ''
        });
      }
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsGlobalProcessing(false);
      setGlobalProcessingMessage('');
    }
  };

  const handleFileUpload = async (files: FileList) => {
    setIsGlobalProcessing(true);
    setGlobalProcessingMessage(`📄 Processing ${files.length} file(s) with AI...`);
    
    try {
      for (const file of Array.from(files)) {
        try {
          // Only accept text files
          if (!file.type.includes('text') && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
            console.warn(`Skipping non-text file: ${file.name}`);
            continue;
          }

          setGlobalProcessingMessage(`📄 Processing "${file.name}" with AI...`);
          
          const content = await readFileContent(file);
          await addItem({
            projectId,
            type: 'document',
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension from title
            content,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'text/plain'
          });
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
    } finally {
      setIsGlobalProcessing(false);
      setGlobalProcessingMessage('');
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleDeleteItem = async (item: KnowledgeBaseItem) => {
    setDeletingItem(item);
  };

  const confirmDeleteItem = async () => {
    if (deletingItem) {
      await deleteItem(deletingItem.id);
      setDeletingItem(null);
    }
  };

  const handleRegenerateEmbeddings = async (item: KnowledgeBaseItem) => {
    setRegeneratingItem(item.id);
    setIsGlobalProcessing(true);
    setGlobalProcessingMessage(`🔄 Regenerating AI embeddings for "${item.title}"...`);
    
    try {
      await regenerateEmbeddings(item.id);
      console.log('Embeddings regenerated successfully');
    } catch (error) {
      console.error('Failed to regenerate embeddings:', error);
    } finally {
      setRegeneratingItem(null);
      setIsGlobalProcessing(false);
      setGlobalProcessingMessage('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-white via-purple-25 to-pink-25">
      <KnowledgeBaseHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFileUpload={handleFileUpload}
        onAddItemClick={() => setIsAddModalOpen(true)}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {filteredItems.length === 0 ? (
          <EmptyState
            icon="📚"
            title="Your knowledge base is empty"
            description="Add documents, URLs, or text snippets to get started! ✨"
            className="py-16 bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl border-2 border-dashed border-purple-300 text-center"
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <KnowledgeBaseItemCard
                key={item.id}
                item={item}
                onDelete={handleDeleteItem}
                onPreview={setSelectedItem}
                onRegenerateEmbeddings={handleRegenerateEmbeddings}
                isRegenerating={regeneratingItem === item.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="✨ Add to Knowledge Base"
      >
        <AddItemForm
          onSubmit={handleAddItem}
          onCancel={() => setIsAddModalOpen(false)}
          isSubmitting={isGlobalProcessing}
        />
      </Modal>

      {/* Item Preview Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem ? `📖 ${selectedItem.title}` : ''}
        size="lg"
      >
        {selectedItem && <ItemPreviewContent item={selectedItem} />}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDeleteItem}
        title="Delete Item"
        message={`Are you sure you want to delete "${deletingItem?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Global Processing Modal */}
      <Modal
        isOpen={isGlobalProcessing}
        onClose={() => {}} // Cannot close while processing
        title="🤖 AI Processing"
        size="md"
      >
        <div className="text-center py-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-teal-500 animate-spin" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-teal-200 rounded-full"></div>
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Processing Your Content
          </h3>
          
          <p className="text-lg text-gray-700 mb-6 font-medium">
            {globalProcessingMessage}
          </p>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="space-y-2 text-sm text-blue-700">
              <p><strong>🧹 AI Curation:</strong> Cleaning and organizing content</p>
              <p><strong>✂️ Smart Chunking:</strong> Splitting into searchable sections</p>
              <p><strong>🔗 Embeddings:</strong> Generating AI vectors for semantic search</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-4 font-medium">
            This process ensures optimal AI-powered search capabilities.<br/>
            Please wait while we enhance your content...
          </p>
        </div>
      </Modal>
    </div>
  );
}
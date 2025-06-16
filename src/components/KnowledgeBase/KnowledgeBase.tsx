import React, { useState } from 'react';
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
  const { items, addItem, deleteItem } = useKnowledgeBase(projectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<KnowledgeBaseItem | null>(null);

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddItem = async (type: 'url' | 'text', title: string, urlOrContent: string) => {
    try {
      if (type === 'url') {
        await addItem({
          projectId,
          type: 'url',
          title,
          url: urlOrContent
        });
      } else {
        await addItem({
          projectId,
          type: 'text',
          title,
          content: urlOrContent
        });
      }
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        const content = await readFileContent(file);
        await addItem({
          projectId,
          type: 'document',
          title: file.name,
          content,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
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
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="✨ Add to Knowledge Base"
      >
        <AddItemForm
          onSubmit={handleAddItem}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem ? `📖 ${selectedItem.title}` : ''}
        size="lg"
      >
        {selectedItem && <ItemPreviewContent item={selectedItem} />}
      </Modal>

      <ConfirmationModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDeleteItem}
        title="Delete Item"
        message={`Are you sure you want to delete "${deletingItem?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
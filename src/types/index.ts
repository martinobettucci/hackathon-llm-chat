import { HistoryMessageType } from '../schema';

// Use the structured message format from our schema
export type Message = HistoryMessageType;

export interface Chat {
  id: string;
  title: string;
  projectId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  prefersStructured?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
}

export interface KnowledgeBaseItem {
  id: string;
  projectId: string;
  type: 'document' | 'url' | 'text';
  title: string;
  content?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  embeddings?: number[]; // Vector embeddings for semantic search
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeBaseChunk {
  id: string;
  itemId: string; // Reference to the parent KnowledgeBaseItem
  projectId: string;
  title?: string; // Chapter/section title if available
  content: string; // Markdown content of this chunk
  order: number; // Order within the parent item (0, 1, 2, ...)
  embeddings?: number[]; // Vector embeddings for this specific chunk
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  selectedGenerationModel?: string;
  selectedEmbeddingModel?: string;
  temperature: number;
  maxTokens: number;
  similarityThreshold?: number;
}
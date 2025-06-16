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
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  model: string;
  temperature: number;
  maxTokens: number;
}
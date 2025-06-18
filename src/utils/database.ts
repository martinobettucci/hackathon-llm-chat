import Dexie, { Table } from 'dexie';
import { Chat, Message, Project, KnowledgeBaseItem, AppSettings } from '../types';
import { FormattedContent, MarkdownBlock, StrategyContent } from '../schema';

export class ChatDatabase extends Dexie {
  chats!: Table<Chat>;
  messages!: Table<Message>;
  projects!: Table<Project>;
  knowledgeBase!: Table<KnowledgeBaseItem>;
  settings!: Table<AppSettings>;

  constructor() {
    super('ChatAppDatabase');
    
    // Version 1: Original schema
    this.version(1).stores({
      chats: 'id, title, projectId, createdAt, updatedAt',
      messages: 'id, chatId, role, timestamp',
      projects: 'id, name, createdAt, updatedAt, isDefault',
      knowledgeBase: 'id, projectId, type, title, createdAt',
      settings: 'theme'
    });

    // Version 2: Updated schema with structured messages
    this.version(2).stores({
      chats: 'id, title, projectId, createdAt, updatedAt, prefersStructured',
      messages: 'id, chatId, actor, timestamp',
      projects: 'id, name, createdAt, updatedAt, isDefault',
      knowledgeBase: 'id, projectId, type, title, createdAt',
      settings: 'theme'
    }).upgrade(trans => {
      // Migrate existing messages to new structure
      return trans.table('messages').toCollection().modify((message: any) => {
        // Convert old message format to new structured format
        if (typeof message.content === 'string') {
          const formattedContent: FormattedContent = {
            type: 'formatted',
            blocks: [{
              type: 'markdown',
              text: message.content
            } as MarkdownBlock]
          };
          
          message.actor = message.role === 'assistant' ? 'llm' : message.role;
          message.content = formattedContent;
          delete message.role;
        }
      });
    });

    // Version 3: Add embeddings support to knowledge base
    this.version(3).stores({
      chats: 'id, title, projectId, createdAt, updatedAt, prefersStructured',
      messages: 'id, chatId, actor, timestamp',
      projects: 'id, name, createdAt, updatedAt, isDefault',
      knowledgeBase: 'id, projectId, type, title, createdAt, embeddings',
      settings: 'theme'
    }).upgrade(trans => {
      // Initialize embeddings field for existing knowledge base items
      return trans.table('knowledgeBase').toCollection().modify((item: any) => {
        if (!item.embeddings) {
          item.embeddings = null; // Will be generated on next access
        }
      });
    });

    // Version 4: Add model selection to settings
    this.version(4).stores({
      chats: 'id, title, projectId, createdAt, updatedAt, prefersStructured',
      messages: 'id, chatId, actor, timestamp',
      projects: 'id, name, createdAt, updatedAt, isDefault',
      knowledgeBase: 'id, projectId, type, title, createdAt, embeddings',
      settings: 'theme, selectedGenerationModel, selectedEmbeddingModel'
    }).upgrade(trans => {
      // Migrate existing settings to include model selection
      return trans.table('settings').toCollection().modify((settings: any) => {
        // Remove old 'model' field and add new separate model fields
        if (settings.model) {
          settings.selectedGenerationModel = settings.model;
          delete settings.model;
        }
        if (!settings.selectedEmbeddingModel) {
          settings.selectedEmbeddingModel = null; // Will use default
        }
      });
    });

    this.on('ready', this.initializeDefaults.bind(this));
  }

  private async initializeDefaults() {
    const projectCount = await this.projects.count();
    if (projectCount === 0) {
      await this.projects.add({
        id: 'default',
        name: 'General',
        description: 'Default project for unassigned chats',
        color: '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: true
      });
    }

    const settingsCount = await this.settings.count();
    if (settingsCount === 0) {
      await this.settings.add({
        theme: 'dark',
        selectedGenerationModel: undefined, // Will use system default
        selectedEmbeddingModel: undefined, // Will use system default
        temperature: 0.7,
        maxTokens: 2048
      });
    }
  }
}

export const db = new ChatDatabase();
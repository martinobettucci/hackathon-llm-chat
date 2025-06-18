import { useState, useEffect } from 'react';
import { db } from '../utils/database';
import { Chat, Message, Project, KnowledgeBaseItem } from '../types';
import { OllamaService } from '../services/ollama';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const allProjects = await db.projects.orderBy('createdAt').toArray();
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, description?: string, color?: string) => {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      color: color || '#3B82F6',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.projects.add(project);
    await loadProjects();
    return project;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    await db.projects.update(id, { ...updates, updatedAt: new Date() });
    await loadProjects();
  };

  const deleteProject = async (id: string) => {
    // Move chats to default project
    await db.chats.where('projectId').equals(id).modify({ projectId: 'default' });
    await db.projects.delete(id);
    await loadProjects();
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: loadProjects
  };
}

export function useChats(projectId?: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, [projectId]);

  const loadChats = async () => {
    try {
      await db.ready;
      
      let query = db.chats.orderBy('updatedAt').reverse();
      
      if (projectId) {
        query = query.filter(chat => chat.projectId === projectId);
      }
      
      const allChats = await query.toArray();
      setChats(allChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChat = async (title: string, projectId: string = 'default') => {
    const chat: Chat = {
      id: crypto.randomUUID(),
      title,
      projectId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      prefersStructured: true // Always use structured format for new chats
    };

    await db.chats.add(chat);
    await loadChats();
    return chat;
  };

  const updateChat = async (id: string, updates: Partial<Chat>) => {
    await db.chats.update(id, { ...updates, updatedAt: new Date() });
    await loadChats();
  };

  const deleteChat = async (id: string) => {
    await db.messages.where('chatId').equals(id).delete();
    await db.chats.delete(id);
    await loadChats();
  };

  const moveChatToProject = async (chatId: string, newProjectId: string) => {
    await db.chats.update(chatId, { projectId: newProjectId, updatedAt: new Date() });
    await loadChats();
  };

  return {
    chats,
    loading,
    createChat,
    updateChat,
    deleteChat,
    moveChatToProject,
    refreshChats: loadChats
  };
}

export function useMessages(chatId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chatId) {
      loadMessages();
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [chatId]);

  const loadMessages = async () => {
    if (!chatId) return;
    
    try {
      const chatMessages = await db.messages
        .where('chatId')
        .equals(chatId)
        .sortBy('timestamp');
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMessage = async (message: Message) => {
    if (!chatId) return;

    await db.messages.add(message);
    
    // Update chat's updated timestamp and title if needed
    const chat = await db.chats.get(chatId);
    if (chat) {
      let title = chat.title;
      if (chat.messages.length === 0 && message.actor === 'user') {
        // Extract title from first user message
        if (message.content.type === 'formatted') {
          const firstBlock = message.content.blocks[0];
          if (firstBlock.type === 'markdown') {
            title = firstBlock.text.slice(0, 50) + (firstBlock.text.length > 50 ? '...' : '');
          } else {
            title = 'Code Discussion';
          }
        } else {
          title = message.content.display.slice(0, 50) + (message.content.display.length > 50 ? '...' : '');
        }
      }
      
      await db.chats.update(chatId, {
        title,
        updatedAt: new Date()
      });
    }

    await loadMessages();
    return message;
  };

  const deleteMessage = async (messageId: string) => {
    await db.messages.delete(messageId);
    await loadMessages();
  };

  return {
    messages,
    loading,
    addMessage,
    deleteMessage,
    refreshMessages: loadMessages
  };
}

export function useKnowledgeBase(projectId?: string) {
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKnowledgeBase();
  }, [projectId]);

  const loadKnowledgeBase = async () => {
    try {
      let query = db.knowledgeBase.orderBy('createdAt').reverse();
      
      if (projectId) {
        query = query.filter(item => item.projectId === projectId);
      }
      
      const allItems = await query.toArray();
      setItems(allItems);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<KnowledgeBaseItem, 'id' | 'createdAt' | 'updatedAt' | 'embeddings'>) => {
    const newItem: KnowledgeBaseItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // Generate embeddings for content if available
      if (newItem.content && newItem.content.trim()) {
        console.log('Generating embeddings for knowledge base item...');
        
        // Prepare text for embedding (combine title and content for better context)
        const textToEmbed = `${newItem.title}\n\n${newItem.content}`;
        
        const embeddings = await OllamaService.generateEmbeddings(textToEmbed);
        newItem.embeddings = embeddings;
        
        console.log(`Generated embeddings with ${embeddings.length} dimensions`);
      } else {
        console.warn('No content available for embedding generation');
      }
    } catch (error) {
      console.error('Error generating embeddings:', error);
      // Continue without embeddings - the item will still be saved
      console.warn('Saving item without embeddings due to generation error');
    }

    await db.knowledgeBase.add(newItem);
    await loadKnowledgeBase();
    return newItem;
  };

  const updateItem = async (id: string, updates: Partial<KnowledgeBaseItem>) => {
    try {
      // If content is being updated, regenerate embeddings
      if (updates.content !== undefined) {
        const item = await db.knowledgeBase.get(id);
        if (item && updates.content && updates.content.trim()) {
          console.log('Regenerating embeddings for updated content...');
          
          const title = updates.title || item.title;
          const textToEmbed = `${title}\n\n${updates.content}`;
          
          const embeddings = await OllamaService.generateEmbeddings(textToEmbed);
          updates.embeddings = embeddings;
          
          console.log(`Regenerated embeddings with ${embeddings.length} dimensions`);
        } else if (updates.content === '') {
          // If content is cleared, remove embeddings
          updates.embeddings = undefined;
        }
      }
    } catch (error) {
      console.error('Error regenerating embeddings:', error);
      // Continue with update without embeddings
    }

    await db.knowledgeBase.update(id, { ...updates, updatedAt: new Date() });
    await loadKnowledgeBase();
  };

  const deleteItem = async (id: string) => {
    await db.knowledgeBase.delete(id);
    await loadKnowledgeBase();
  };

  const regenerateEmbeddings = async (id: string) => {
    try {
      const item = await db.knowledgeBase.get(id);
      if (!item || !item.content || !item.content.trim()) {
        throw new Error('Item not found or has no content to embed');
      }

      console.log('Regenerating embeddings for item:', item.title);
      
      const textToEmbed = `${item.title}\n\n${item.content}`;
      const embeddings = await OllamaService.generateEmbeddings(textToEmbed);
      
      await db.knowledgeBase.update(id, { 
        embeddings, 
        updatedAt: new Date() 
      });
      
      await loadKnowledgeBase();
      
      console.log(`Successfully regenerated embeddings with ${embeddings.length} dimensions`);
      return embeddings;
    } catch (error) {
      console.error('Error regenerating embeddings:', error);
      throw error;
    }
  };

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    regenerateEmbeddings,
    refreshKnowledgeBase: loadKnowledgeBase
  };
}
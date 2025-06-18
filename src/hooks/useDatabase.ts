import { useState, useEffect } from 'react';
import { db } from '../utils/database';
import { Chat, Message, Project, KnowledgeBaseItem, KnowledgeBaseChunk } from '../types';
import { OllamaService } from '../services/ollama';
import { splitMarkdownIntoChunks, validateChunkQuality, getChunkingStats } from '../utils/markdownChunker';

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
    console.log('🤖 Starting mandatory AI curation process...');
    
    try {
      // Step 1: Prepare content for curation
      let rawContent = '';
      let originalTitle = item.title;
      
      if (item.type === 'url' && item.url) {
        if (item.content && item.content.trim()) {
          // Use provided content if available
          rawContent = item.content;
        } else {
          // For URLs without content, we'll curate just the URL and title
          rawContent = `URL: ${item.url}\nTitle: ${item.title}`;
        }
      } else if (item.content) {
        rawContent = item.content;
      } else {
        throw new Error('No content available for curation');
      }

      console.log('📝 Raw content length:', rawContent.length);

      // Step 2: MANDATORY AI curation
      console.log('🧹 Cleaning and organizing content with AI...');
      
      const curatedResult = await OllamaService.cleanAndOrganizeContent(
        rawContent,
        originalTitle
      );

      console.log('✨ AI curation completed');
      console.log('📊 Curated content length:', curatedResult.content.length);
      
      // Step 3: Create the knowledge base item with curated content
      const newItem: KnowledgeBaseItem = {
        ...item,
        id: crypto.randomUUID(),
        title: curatedResult.title || item.title, // Use AI-generated title if available
        content: curatedResult.content, // Always use curated content
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('📚 Final item title:', newItem.title);

      // Step 4: Generate embeddings for the full document
      console.log('🔗 Generating embeddings for full document...');
      
      try {
        const textToEmbed = `${newItem.title}\n\n${newItem.content}`;
        const documentEmbeddings = await OllamaService.generateEmbeddings(textToEmbed);
        newItem.embeddings = documentEmbeddings;
        
        console.log(`📊 Generated document embeddings with ${documentEmbeddings.length} dimensions`);
      } catch (embeddingError) {
        console.error('❌ Error generating document embeddings:', embeddingError);
        console.warn('⚠️ Continuing without document embeddings');
      }

      // Step 5: Save the main item
      await db.knowledgeBase.add(newItem);
      console.log('💾 Main knowledge base item saved');

      // Step 6: Split into chunks using markdown structure
      console.log('✂️ Splitting content into chunks...');
      
      const chunkTemplates = splitMarkdownIntoChunks(
        newItem.content,
        newItem.id,
        newItem.projectId
      );

      console.log(`📦 Created ${chunkTemplates.length} chunks`);
      
      // Log chunking statistics
      const stats = getChunkingStats(chunkTemplates);
      console.log('📈 Chunking stats:', stats);

      // Step 7: Generate embeddings and save each chunk
      const chunks: KnowledgeBaseChunk[] = [];
      
      for (let i = 0; i < chunkTemplates.length; i++) {
        const template = chunkTemplates[i];
        
        // Validate chunk quality
        const validation = validateChunkQuality(template);
        if (!validation.isValid) {
          console.warn(`⚠️ Chunk ${i} quality issues:`, validation.issues);
          // Skip poor quality chunks
          continue;
        }

        console.log(`🔗 Generating embeddings for chunk ${i + 1}/${chunkTemplates.length}...`);
        
        try {
          // Prepare chunk text for embedding (include title if available)
          const chunkTextToEmbed = template.title 
            ? `${template.title}\n\n${template.content}`
            : template.content;
            
          const chunkEmbeddings = await OllamaService.generateEmbeddings(chunkTextToEmbed);
          
          const chunk: KnowledgeBaseChunk = {
            ...template,
            id: crypto.randomUUID(),
            embeddings: chunkEmbeddings,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          chunks.push(chunk);
          console.log(`✅ Chunk ${i + 1} processed with ${chunkEmbeddings.length}D embeddings`);
          
        } catch (chunkEmbeddingError) {
          console.error(`❌ Error generating embeddings for chunk ${i}:`, chunkEmbeddingError);
          
          // Save chunk without embeddings rather than failing completely
          const chunk: KnowledgeBaseChunk = {
            ...template,
            id: crypto.randomUUID(),
            embeddings: undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          chunks.push(chunk);
          console.warn(`⚠️ Chunk ${i + 1} saved without embeddings`);
        }
      }

      // Step 8: Bulk save all chunks
      if (chunks.length > 0) {
        await db.knowledgeBaseChunks.bulkAdd(chunks);
        console.log(`💾 Saved ${chunks.length} chunks to database`);
      } else {
        console.warn('⚠️ No valid chunks were created');
      }

      // Step 9: Refresh the UI
      await loadKnowledgeBase();
      
      console.log('🎉 Knowledge base item creation completed successfully!');
      console.log(`📊 Final stats: 1 document, ${chunks.length} chunks, ${newItem.embeddings ? 'with' : 'without'} document embeddings`);
      
      return newItem;

    } catch (error) {
      console.error('💥 Error in mandatory AI curation process:', error);
      
      // For critical errors, we'll still try to save a basic version
      console.log('🚨 Attempting fallback save without AI processing...');
      
      try {
        const fallbackItem: KnowledgeBaseItem = {
          ...item,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.knowledgeBase.add(fallbackItem);
        await loadKnowledgeBase();
        
        console.log('⚠️ Item saved without AI processing due to error');
        return fallbackItem;
        
      } catch (fallbackError) {
        console.error('💥 Fallback save also failed:', fallbackError);
        throw new Error(`Failed to add knowledge base item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const updateItem = async (id: string, updates: Partial<KnowledgeBaseItem>) => {
    try {
      const item = await db.knowledgeBase.get(id);
      if (!item) {
        throw new Error('Knowledge base item not found');
      }

      // If content is being updated, we need to re-curate and re-chunk
      if (updates.content !== undefined || updates.title !== undefined) {
        console.log('🔄 Content/title updated, starting re-curation process...');
        
        const newTitle = updates.title !== undefined ? updates.title : item.title;
        const newContent = updates.content !== undefined ? updates.content : item.content;
        
        if (newContent && newContent.trim()) {
          console.log('🧹 Re-cleaning content with AI...');
          
          try {
            // Re-curate the content
            const curatedResult = await OllamaService.cleanAndOrganizeContent(
              newContent,
              newTitle
            );
            
            // Update with curated content
            updates.content = curatedResult.content;
            if (curatedResult.title && !updates.title) {
              updates.title = curatedResult.title;
            }

            // Regenerate document embeddings
            console.log('🔗 Regenerating document embeddings...');
            const textToEmbed = `${updates.title || item.title}\n\n${updates.content}`;
            const documentEmbeddings = await OllamaService.generateEmbeddings(textToEmbed);
            updates.embeddings = documentEmbeddings;
            
            console.log('✅ Document embeddings regenerated');

          } catch (curationError) {
            console.error('❌ Re-curation failed:', curationError);
            console.log('⚠️ Proceeding without re-curation');
          }
        }

        // Delete old chunks
        console.log('🗑️ Removing old chunks...');
        await db.knowledgeBaseChunks.where('itemId').equals(id).delete();

        // Generate new chunks if we have content
        if (updates.content && updates.content.trim()) {
          console.log('✂️ Creating new chunks...');
          
          const chunkTemplates = splitMarkdownIntoChunks(
            updates.content,
            id,
            item.projectId
          );

          console.log(`📦 Created ${chunkTemplates.length} new chunks`);

          // Generate embeddings and save new chunks
          const newChunks: KnowledgeBaseChunk[] = [];
          
          for (let i = 0; i < chunkTemplates.length; i++) {
            const template = chunkTemplates[i];
            
            const validation = validateChunkQuality(template);
            if (!validation.isValid) {
              console.warn(`⚠️ New chunk ${i} quality issues:`, validation.issues);
              continue;
            }

            try {
              const chunkTextToEmbed = template.title 
                ? `${template.title}\n\n${template.content}`
                : template.content;
                
              const chunkEmbeddings = await OllamaService.generateEmbeddings(chunkTextToEmbed);
              
              const chunk: KnowledgeBaseChunk = {
                ...template,
                id: crypto.randomUUID(),
                embeddings: chunkEmbeddings,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              newChunks.push(chunk);
              
            } catch (chunkError) {
              console.error(`❌ Error processing new chunk ${i}:`, chunkError);
              
              const chunk: KnowledgeBaseChunk = {
                ...template,
                id: crypto.randomUUID(),
                embeddings: undefined,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              newChunks.push(chunk);
            }
          }

          if (newChunks.length > 0) {
            await db.knowledgeBaseChunks.bulkAdd(newChunks);
            console.log(`💾 Saved ${newChunks.length} new chunks`);
          }
        }
      } else {
        // For other updates (like title only), just regenerate embeddings if needed
        if (updates.title && item.content) {
          try {
            console.log('🔗 Regenerating embeddings for title change...');
            const textToEmbed = `${updates.title}\n\n${item.content}`;
            const embeddings = await OllamaService.generateEmbeddings(textToEmbed);
            updates.embeddings = embeddings;
          } catch (error) {
            console.error('❌ Error regenerating embeddings for title change:', error);
          }
        }
      }

      // Update the main item
      await db.knowledgeBase.update(id, { ...updates, updatedAt: new Date() });
      await loadKnowledgeBase();
      
      console.log('✅ Knowledge base item update completed');
      
    } catch (error) {
      console.error('💥 Error updating knowledge base item:', error);
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      // Delete all associated chunks first
      await db.knowledgeBaseChunks.where('itemId').equals(id).delete();
      console.log('🗑️ Deleted associated chunks');
      
      // Delete the main item
      await db.knowledgeBase.delete(id);
      console.log('🗑️ Deleted main knowledge base item');
      
      await loadKnowledgeBase();
    } catch (error) {
      console.error('❌ Error deleting knowledge base item:', error);
      throw error;
    }
  };

  const regenerateEmbeddings = async (id: string) => {
    try {
      const item = await db.knowledgeBase.get(id);
      if (!item || !item.content || !item.content.trim()) {
        throw new Error('Item not found or has no content to embed');
      }

      console.log('🔄 Regenerating embeddings for item:', item.title);
      
      // Regenerate document embeddings
      const textToEmbed = `${item.title}\n\n${item.content}`;
      const documentEmbeddings = await OllamaService.generateEmbeddings(textToEmbed);
      
      await db.knowledgeBase.update(id, { 
        embeddings: documentEmbeddings, 
        updatedAt: new Date() 
      });

      // Regenerate chunk embeddings
      const chunks = await db.knowledgeBaseChunks.where('itemId').equals(id).toArray();
      
      for (const chunk of chunks) {
        try {
          const chunkTextToEmbed = chunk.title 
            ? `${chunk.title}\n\n${chunk.content}`
            : chunk.content;
            
          const chunkEmbeddings = await OllamaService.generateEmbeddings(chunkTextToEmbed);
          
          await db.knowledgeBaseChunks.update(chunk.id, {
            embeddings: chunkEmbeddings,
            updatedAt: new Date()
          });
          
        } catch (chunkError) {
          console.error(`❌ Error regenerating embeddings for chunk ${chunk.id}:`, chunkError);
        }
      }
      
      await loadKnowledgeBase();
      
      console.log(`✅ Successfully regenerated embeddings for document and ${chunks.length} chunks`);
      return documentEmbeddings;
    } catch (error) {
      console.error('❌ Error regenerating embeddings:', error);
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
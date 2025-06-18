import { HistoryMessageType, MarkdownBlockType } from '../../schema';
import { OllamaService } from '../ollama';
import { StrategyTaskManager } from './strategyTaskManager';
import { db } from '../../utils/database';
import { getSimilarityThreshold } from '../settingsService';

// Cosine similarity function for embeddings comparison
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Retrieve relevant documents from knowledge base using semantic search on chunks
export async function retrieveRelevantDocuments(
  userQuery: string,
  projectId: string,
  taskManager: StrategyTaskManager,
  topK: number = 5
): Promise<{ documents: any[], contextInfo: string, ragAgentMessage?: HistoryMessageType }> {
  try {
    taskManager.startTask('retrieve', 'Recherche de documents pertinents...');

    // Get similarity threshold from settings
    const similarityThreshold = getSimilarityThreshold();
    taskManager.updateTaskMessage('retrieve', `Seuil de similarité: ${similarityThreshold.toFixed(2)}`);

    // Generate embeddings for the user query
    taskManager.updateTaskMessage('retrieve', 'Génération des embeddings de la requête...');
    const queryEmbeddings = await OllamaService.generateEmbeddings(userQuery);

    // Get all knowledge base chunks with embeddings for this project
    taskManager.updateTaskMessage('retrieve', 'Récupération des chunks...');
    const knowledgeChunks = await db.knowledgeBaseChunks
      .where('projectId')
      .equals(projectId)
      .filter(chunk => chunk.embeddings && chunk.embeddings.length > 0 && chunk.content)
      .toArray();

    if (knowledgeChunks.length === 0) {
      taskManager.completeTask('retrieve', 'Aucun chunk avec embeddings trouvé');
      return { documents: [], contextInfo: '' };
    }

    taskManager.updateTaskMessage('retrieve', `Analyse de ${knowledgeChunks.length} chunks...`);

    // Calculate similarities and rank chunks
    const chunkSimilarities = knowledgeChunks.map(chunk => {
      try {
        const similarity = cosineSimilarity(queryEmbeddings, chunk.embeddings!);
        return { chunk, similarity };
      } catch (error) {
        console.error(`Error calculating similarity for chunk ${chunk.id}:`, error);
        return { chunk, similarity: 0 };
      }
    });

    // Sort by similarity (highest first) and filter by threshold
    const relevantChunks = chunkSimilarities
      .filter(doc => doc.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    if (relevantChunks.length === 0) {
      taskManager.completeTask('retrieve', `Aucun chunk au-dessus du seuil ${similarityThreshold.toFixed(2)}`);
      return { documents: [], contextInfo: '' };
    }

    // Get the parent knowledge base items for context
    taskManager.updateTaskMessage('retrieve', 'Récupération des métadonnées...');
    const parentItemIds = [...new Set(relevantChunks.map(rc => rc.chunk.itemId))];
    const parentItems = await db.knowledgeBase.where('id').anyOf(parentItemIds).toArray();
    const parentItemsMap = new Map(parentItems.map(item => [item.id, item]));

    // Create enhanced context information with document titles
    const documentTitles = [...new Set(relevantChunks.map(rc => {
      const parentItem = parentItemsMap.get(rc.chunk.itemId);
      return parentItem?.title || 'Document sans titre';
    }))];
    
    const uniqueDocuments = parentItemIds.length;
    const contextInfo = `Contexte augmenté avec ${relevantChunks.length} section${relevantChunks.length > 1 ? 's' : ''} de ${uniqueDocuments} document${uniqueDocuments > 1 ? 's' : ''}: ${documentTitles.slice(0, 3).join(', ')}${documentTitles.length > 3 ? '...' : ''}`;

    taskManager.completeTask('retrieve', `${relevantChunks.length} section(s) pertinente(s) trouvée(s)`);

    // Return relevant chunks with their content and parent item metadata
    const documents = relevantChunks.map(rc => {
      const parentItem = parentItemsMap.get(rc.chunk.itemId);
      return {
        title: rc.chunk.title || parentItem?.title || 'Untitled',
        content: rc.chunk.content,
        similarity: rc.similarity,
        chunkOrder: rc.chunk.order,
        parentDocumentTitle: parentItem?.title,
        parentDocumentType: parentItem?.type,
        parentDocumentUrl: parentItem?.url
      };
    });

    return { documents, contextInfo };

  } catch (error) {
    console.error('Error retrieving relevant documents:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la récupération';
    taskManager.errorTask('retrieve', `Erreur: ${errorMessage}`);
    
    // Return empty results on error to allow the conversation to continue
    return { documents: [], contextInfo: '' };
  }
}
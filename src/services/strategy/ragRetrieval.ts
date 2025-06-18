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
    console.log('📚 [RAG RETRIEVAL] Starting document retrieval process...');
    console.log(`📚 [RAG RETRIEVAL] Query: "${userQuery}"`);
    console.log(`📚 [RAG RETRIEVAL] Project ID: ${projectId}`);
    console.log(`📚 [RAG RETRIEVAL] TopK limit: ${topK}`);
    
    taskManager.startTask('retrieve', 'Recherche de documents pertinents...');

    // Get similarity threshold from settings
    const similarityThreshold = getSimilarityThreshold();
    console.log(`📚 [RAG RETRIEVAL] Similarity threshold: ${similarityThreshold.toFixed(3)}`);
    taskManager.updateTaskMessage('retrieve', `Seuil de similarité: ${similarityThreshold.toFixed(2)}`);

    // Generate embeddings for the user query
    taskManager.updateTaskMessage('retrieve', 'Génération des embeddings de la requête...');
    console.log('📚 [RAG RETRIEVAL] Generating query embeddings...');
    const queryEmbeddings = await OllamaService.generateEmbeddings(userQuery);
    console.log(`📚 [RAG RETRIEVAL] Query embeddings generated: ${queryEmbeddings.length} dimensions`);

    // Get all knowledge base chunks with embeddings for this project
    taskManager.updateTaskMessage('retrieve', 'Récupération des chunks...');
    console.log('📚 [RAG RETRIEVAL] Fetching knowledge base chunks...');
    const knowledgeChunks = await db.knowledgeBaseChunks
      .where('projectId')
      .equals(projectId)
      .filter(chunk => chunk.embeddings && chunk.embeddings.length > 0 && chunk.content)
      .toArray();

    console.log(`📚 [RAG RETRIEVAL] Found ${knowledgeChunks.length} chunks with embeddings`);

    if (knowledgeChunks.length === 0) {
      console.log('📚 [RAG RETRIEVAL] ⚠️ No chunks with embeddings found');
      taskManager.completeTask('retrieve', 'Aucun chunk avec embeddings trouvé');
      return { documents: [], contextInfo: '' };
    }

    taskManager.updateTaskMessage('retrieve', `Analyse de ${knowledgeChunks.length} chunks...`);

    // Calculate similarities and rank chunks
    console.log('📚 [RAG RETRIEVAL] Calculating similarities...');
    const chunkSimilarities = knowledgeChunks.map((chunk, index) => {
      try {
        const similarity = cosineSimilarity(queryEmbeddings, chunk.embeddings!);
        
        // Log every 10th chunk or high similarity chunks for debugging
        if (index % 10 === 0 || similarity > 0.8) {
          console.log(`📚 [RAG RETRIEVAL]   Chunk ${index + 1}: similarity ${similarity.toFixed(3)} - "${chunk.title || 'Untitled'}"`);
        }
        
        return { chunk, similarity };
      } catch (error) {
        console.error(`📚 [RAG RETRIEVAL] ❌ Error calculating similarity for chunk ${chunk.id}:`, error);
        return { chunk, similarity: 0 };
      }
    });

    console.log('📚 [RAG RETRIEVAL] Similarity calculation completed');

    // Sort by similarity (highest first) and filter by threshold
    const relevantChunks = chunkSimilarities
      .filter(doc => doc.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    console.log(`📚 [RAG RETRIEVAL] Filtering results:`);
    console.log(`📚 [RAG RETRIEVAL]   - Total chunks: ${chunkSimilarities.length}`);
    console.log(`📚 [RAG RETRIEVAL]   - Above threshold (${similarityThreshold.toFixed(3)}): ${chunkSimilarities.filter(doc => doc.similarity >= similarityThreshold).length}`);
    console.log(`📚 [RAG RETRIEVAL]   - Final selection (top ${topK}): ${relevantChunks.length}`);

    if (relevantChunks.length === 0) {
      console.log('📚 [RAG RETRIEVAL] ⚠️ No chunks found above similarity threshold');
      
      // Log some statistics for debugging
      const allSimilarities = chunkSimilarities.map(cs => cs.similarity).sort((a, b) => b - a);
      if (allSimilarities.length > 0) {
        console.log(`📚 [RAG RETRIEVAL] Similarity statistics:`);
        console.log(`📚 [RAG RETRIEVAL]   - Highest: ${allSimilarities[0].toFixed(3)}`);
        console.log(`📚 [RAG RETRIEVAL]   - Median: ${allSimilarities[Math.floor(allSimilarities.length / 2)].toFixed(3)}`);
        console.log(`📚 [RAG RETRIEVAL]   - Lowest: ${allSimilarities[allSimilarities.length - 1].toFixed(3)}`);
        console.log(`📚 [RAG RETRIEVAL] Consider lowering threshold if appropriate matches expected`);
      }
      
      taskManager.completeTask('retrieve', `Aucun chunk au-dessus du seuil ${similarityThreshold.toFixed(2)}`);
      return { documents: [], contextInfo: '' };
    }

    // Log details of selected chunks
    console.log('📚 [RAG RETRIEVAL] Selected relevant chunks:');
    relevantChunks.forEach((rc, index) => {
      const title = rc.chunk.title || 'Untitled';
      const contentPreview = rc.chunk.content.substring(0, 100).replace(/\n/g, ' ') + 
        (rc.chunk.content.length > 100 ? '...' : '');
      console.log(`📚 [RAG RETRIEVAL]   ${index + 1}. "${title}" (similarity: ${rc.similarity.toFixed(3)})`);
      console.log(`📚 [RAG RETRIEVAL]      Content: "${contentPreview}"`);
    });

    // Get the parent knowledge base items for context
    taskManager.updateTaskMessage('retrieve', 'Récupération des métadonnées...');
    console.log('📚 [RAG RETRIEVAL] Fetching parent item metadata...');
    const parentItemIds = [...new Set(relevantChunks.map(rc => rc.chunk.itemId))];
    console.log(`📚 [RAG RETRIEVAL] Unique parent items: ${parentItemIds.length}`);
    
    const parentItems = await db.knowledgeBase.where('id').anyOf(parentItemIds).toArray();
    const parentItemsMap = new Map(parentItems.map(item => [item.id, item]));

    // Log parent items
    console.log('📚 [RAG RETRIEVAL] Parent items:');
    parentItems.forEach((item, index) => {
      console.log(`📚 [RAG RETRIEVAL]   ${index + 1}. "${item.title}" (${item.type})`);
      if (item.url) {
        console.log(`📚 [RAG RETRIEVAL]      URL: ${item.url}`);
      }
    });

    // Create enhanced context information with document titles
    const documentTitles = [...new Set(relevantChunks.map(rc => {
      const parentItem = parentItemsMap.get(rc.chunk.itemId);
      return parentItem?.title || 'Document sans titre';
    }))];
    
    const uniqueDocuments = parentItemIds.length;
    const contextInfo = `Contexte augmenté avec ${relevantChunks.length} section${relevantChunks.length > 1 ? 's' : ''} de ${uniqueDocuments} document${uniqueDocuments > 1 ? 's' : ''}: ${documentTitles.slice(0, 3).join(', ')}${documentTitles.length > 3 ? '...' : ''}`;

    console.log(`📚 [RAG RETRIEVAL] Context info: "${contextInfo}"`);
    console.log(`📚 [RAG RETRIEVAL] Document titles: ${documentTitles.join(', ')}`);

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

    console.log('📚 [RAG RETRIEVAL] ✅ RAG retrieval completed successfully');
    console.log(`📚 [RAG RETRIEVAL] Final result: ${documents.length} documents ready for context augmentation`);

    return { documents, contextInfo };

  } catch (error) {
    console.error('📚 [RAG RETRIEVAL] ❌ Error retrieving relevant documents:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la récupération';
    taskManager.errorTask('retrieve', `Erreur: ${errorMessage}`);
    
    console.log('📚 [RAG RETRIEVAL] ⚠️ Returning empty results due to error');
    
    // Return empty results on error to allow the conversation to continue
    return { documents: [], contextInfo: '' };
  }
}
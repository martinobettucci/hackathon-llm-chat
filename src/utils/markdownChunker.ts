import { KnowledgeBaseChunk } from '../types';

/**
 * Splits markdown content into logical chunks based on headers with hierarchical context
 * Each chunk includes all preceding hierarchical headers but only the content of its own section
 */
export function splitMarkdownIntoChunks(
  markdownContent: string,
  itemId: string,
  projectId: string
): Omit<KnowledgeBaseChunk, 'id' | 'createdAt' | 'updatedAt' | 'embeddings'>[] {
  if (!markdownContent || !markdownContent.trim()) {
    return [];
  }

  const chunks: Omit<KnowledgeBaseChunk, 'id' | 'createdAt' | 'updatedAt' | 'embeddings'>[] = [];
  const lines = markdownContent.split('\n');
  
  // Track hierarchical headers stack
  const headerStack: Array<{ level: number; text: string; line: string }> = [];
  
  let currentChunk: {
    title?: string;
    content: string[];
    startLine: number;
  } | null = null;
  
  let chunkOrder = 0;

  const finishCurrentChunk = () => {
    if (currentChunk && currentChunk.content.length > 0) {
      // Prepend hierarchical headers to chunk content
      const hierarchicalHeaders = headerStack.map(header => header.line);
      const fullContent = [...hierarchicalHeaders, ...currentChunk.content].join('\n').trim();
      
      if (fullContent) {
        chunks.push({
          itemId,
          projectId,
          title: currentChunk.title,
          content: fullContent,
          order: chunkOrder++
        });
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this line is a header
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    
    if (headerMatch) {
      const headerLevel = headerMatch[1].length;
      const headerTitle = headerMatch[2].trim();
      
      // Update header stack - remove headers of same or deeper level
      while (headerStack.length > 0 && headerStack[headerStack.length - 1].level >= headerLevel) {
        headerStack.pop();
      }
      
      // Add current header to stack
      headerStack.push({
        level: headerLevel,
        text: headerTitle,
        line: line
      });
      
      // For level 2+ headers, finish current chunk and start new one
      if (headerLevel >= 2) {
        finishCurrentChunk();
        
        currentChunk = {
          title: headerTitle,
          content: [line], // Include only the current header content, hierarchical headers will be prepended
          startLine: i
        };
      } else {
        // For level 1 headers (main title), add to current chunk or start new one
        if (!currentChunk) {
          currentChunk = {
            title: headerTitle,
            content: [line],
            startLine: i
          };
        } else {
          currentChunk.content.push(line);
        }
      }
    } else {
      // Add line to current chunk, or start first chunk if none exists
      if (!currentChunk) {
        currentChunk = {
          title: undefined,
          content: [line],
          startLine: i
        };
      } else {
        currentChunk.content.push(line);
      }
    }
  }

  // Finish the last chunk
  finishCurrentChunk();

  // If no chunks were created (no headers found), create a single chunk with all content
  if (chunks.length === 0 && markdownContent.trim()) {
    chunks.push({
      itemId,
      projectId,
      title: undefined,
      content: markdownContent.trim(),
      order: 0
    });
  }

  // Clean up chunks - remove empty ones and ensure minimum content length
  return chunks.filter(chunk => {
    const cleanContent = chunk.content.trim();
    // Only keep chunks with meaningful content (more than just headers)
    const contentWithoutHeaders = cleanContent.replace(/^#{1,6}\s+.+$/gm, '').trim();
    return contentWithoutHeaders.length > 10;
  });
}

/**
 * Validates a chunk's content quality
 */
export function validateChunkQuality(chunk: { content: string; title?: string }): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!chunk.content || chunk.content.trim().length < 10) {
    issues.push('Content too short (minimum 10 characters)');
  }
  
  if (chunk.content.length > 8000) {
    issues.push('Content too long (maximum 8000 characters) - consider splitting further');
  }
  
  // Check for meaningful content (not just headers, whitespace, or minimal text)
  const contentWithoutHeaders = chunk.content.replace(/^#{1,6}\s+.+$/gm, '').trim();
  if (contentWithoutHeaders.length < 5) {
    issues.push('Content lacks meaningful text beyond headers');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Estimates reading time for a chunk (useful for quality metrics)
 */
export function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200; // Average reading speed
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Creates a summary of chunk statistics
 */
export function getChunkingStats(chunks: { content: string; title?: string }[]): {
  totalChunks: number;
  averageLength: number;
  chunksWithTitles: number;
  totalReadingTime: number;
} {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
  const chunksWithTitles = chunks.filter(chunk => chunk.title).length;
  const totalReadingTime = chunks.reduce((sum, chunk) => sum + estimateReadingTime(chunk.content), 0);
  
  return {
    totalChunks: chunks.length,
    averageLength: chunks.length > 0 ? Math.round(totalLength / chunks.length) : 0,
    chunksWithTitles,
    totalReadingTime
  };
}
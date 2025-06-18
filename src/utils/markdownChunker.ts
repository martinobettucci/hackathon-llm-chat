import { KnowledgeBaseChunk } from '../types';

/**
 * Splits markdown content into logical chunks based on headers
 * Each chunk represents a chapter or section with its content
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
  
  let currentChunk: {
    title?: string;
    content: string[];
    startLine: number;
  } | null = null;
  
  let chunkOrder = 0;

  const finishCurrentChunk = () => {
    if (currentChunk && currentChunk.content.length > 0) {
      const content = currentChunk.content.join('\n').trim();
      if (content) {
        chunks.push({
          itemId,
          projectId,
          title: currentChunk.title,
          content,
          order: chunkOrder++
        });
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this line is a header (## or ###, but not # to avoid splitting on main title)
    const headerMatch = trimmedLine.match(/^(#{2,6})\s+(.+)$/);
    
    if (headerMatch) {
      // Finish the current chunk before starting a new one
      finishCurrentChunk();
      
      // Start a new chunk
      const headerLevel = headerMatch[1].length;
      const headerTitle = headerMatch[2].trim();
      
      currentChunk = {
        title: headerTitle,
        content: [line], // Include the header in the chunk content
        startLine: i
      };
    } else {
      // Add line to current chunk, or start first chunk if none exists
      if (!currentChunk) {
        currentChunk = {
          title: undefined, // No title for the first chunk if it doesn't start with a header
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
    // Only keep chunks with meaningful content (more than just a header)
    return cleanContent.length > 10;
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
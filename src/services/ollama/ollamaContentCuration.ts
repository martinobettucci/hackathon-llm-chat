import { getCurrentOllamaHost } from './ollamaClient';
import { getAvailableModel, setServiceUnavailable } from './ollamaModels';
import { chat, ChatMessage } from './ollamaChat';

export async function cleanAndOrganizeContent(
  rawContent: string, 
  existingTitle?: string
): Promise<{ content: string; title?: string }> {
  try {
    // Ensure we have content to clean
    if (!rawContent || !rawContent.trim()) {
      throw new Error('Cannot clean empty content');
    }

    const needsTitle = !existingTitle || !existingTitle.trim();

    const systemPrompt = `You are a content organization assistant. Your task is to clean, structure, and organize text content into well-formatted Markdown${needsTitle ? ' and generate an appropriate title' : ''}.

INSTRUCTIONS:
1. Clean up the text by removing unnecessary whitespace, fixing formatting issues, and correcting obvious typos
2. Organize the content with proper Markdown structure using headers, lists, and formatting
3. Create a logical flow with appropriate sections and subsections
4. Preserve all important information while making it more readable
5. Use proper Markdown syntax for formatting (headers, lists, code blocks, links, etc.)
6. Remove redundant or irrelevant content (like navigation text, ads, etc.)
7. Ensure the content is well-structured and easy to read
${needsTitle ? '8. Generate a catchy, descriptive title that summarizes the main topic' : ''}

${needsTitle ? `RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "title": "A catchy, descriptive title (max 80 characters)",
  "content": "The cleaned and organized Markdown content"
}

TITLE GUIDELINES:
- Make it catchy and engaging
- Keep it under 80 characters
- Capture the main topic or theme
- Make it suitable for a knowledge base entry
- Avoid generic titles like "Article" or "Content"
` : `IMPORTANT: 
- Only return the cleaned Markdown content, no additional commentary
- Preserve the original meaning and all important information
- Use appropriate Markdown formatting for better readability`}`;

    const userPrompt = existingTitle 
      ? `Please clean and organize this content about "${existingTitle}":\n\n${rawContent}`
      : `Please clean and organize this content and generate an appropriate title:\n\n${rawContent}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const selectedModel = await getAvailableModel();
    
    // Use centralized chat function instead of direct ollama.chat call
    const responseContent = await chat(messages, selectedModel, false);
    
    // Reset service unavailable flag on successful response
    setServiceUnavailable(false);
    
    let result: { content: string; title?: string };

    if (needsTitle) {
      try {
        // Try to parse as JSON for title + content
        const jsonResponse = JSON.parse(responseContent);
        
        if (jsonResponse.title && jsonResponse.content) {
          result = {
            content: jsonResponse.content.trim(),
            title: jsonResponse.title.trim()
          };
        } else {
          // Fallback: treat as content only
          console.warn('AI response missing title or content fields, using as content only');
          result = { content: responseContent.trim() };
        }
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON, treating as content only');
        result = { content: responseContent.trim() };
      }
    } else {
      // Clean up the response (remove any extra formatting or explanations)
      let cleanedContent = responseContent.trim();
      
      // Remove common AI response prefixes/suffixes
      const prefixesToRemove = [
        'Here is the cleaned and organized content:',
        'Here\'s the cleaned and organized content:',
        'The cleaned and organized content is:',
        'Cleaned and organized content:',
        '```markdown',
        '```'
      ];
      
      for (const prefix of prefixesToRemove) {
        if (cleanedContent.toLowerCase().startsWith(prefix.toLowerCase())) {
          cleanedContent = cleanedContent.substring(prefix.length).trim();
        }
        if (cleanedContent.toLowerCase().endsWith(prefix.toLowerCase())) {
          cleanedContent = cleanedContent.substring(0, cleanedContent.length - prefix.length).trim();
        }
      }
      
      result = { content: cleanedContent };
    }
    
    // Validate we have meaningful content
    if (!result.content || result.content.length < 10) {
      console.warn('AI returned very short content, using original');
      result.content = rawContent;
    }

    // Validate title if generated
    if (result.title) {
      if (result.title.length > 100) {
        result.title = result.title.substring(0, 97) + '...';
      }
      if (result.title.length < 3) {
        console.warn('AI generated very short title, removing it');
        delete result.title;
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Content cleaning error:', error);
    
    const currentHost = getCurrentOllamaHost();
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      setServiceUnavailable(true);
      throw new Error(`Connection to AI service failed at ${currentHost}. This appears to be a network connectivity issue.`);
    }
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw new Error('The requested AI model is not available. Please try again or contact support.');
      }
      
      if (error.message.includes('CORS')) {
        setServiceUnavailable(true);
        throw new Error(`Cross-origin request blocked. The Ollama server at ${currentHost} needs to be configured to allow requests from this domain.`);
      }
      
      // Re-throw our custom error messages
      if (error.message.includes('Cannot clean empty content')) {
        throw error;
      }
    }
    
    setServiceUnavailable(true);
    throw new Error('Failed to clean content with AI. Please check your connection and try again.');
  }
}
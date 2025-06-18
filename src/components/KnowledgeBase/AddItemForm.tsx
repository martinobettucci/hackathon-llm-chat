import React, { useState, useEffect } from 'react';
import { Link, FileText, Download, AlertTriangle, Sparkles, CheckCircle, Wand2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { OllamaService } from '../../services/ollama';

interface AddItemFormProps {
  onSubmit: (type: 'url' | 'text', title: string, url?: string, content?: string) => void;
  onCancel: () => void;
}

export function AddItemForm({ onSubmit, onCancel }: AddItemFormProps) {
  const [type, setType] = useState<'url' | 'text'>('url');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isCleaningContent, setIsCleaningContent] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cleaningError, setCleaningError] = useState<string | null>(null);
  const [isContentCleaned, setIsContentCleaned] = useState(false);
  const [isTitleGenerated, setIsTitleGenerated] = useState(false);

  // Reset form when type changes
  useEffect(() => {
    setContent('');
    setFetchError(null);
    setCleaningError(null);
    setIsContentCleaned(false);
    setIsTitleGenerated(false);
  }, [type]);

  const extractTextFromHTML = (html: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Remove script and style elements
      const scripts = doc.querySelectorAll('script, style, nav, header, footer, aside');
      scripts.forEach(el => el.remove());
      
      // Try to find main content areas first
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '.post-content',
        '.entry-content',
        '#content'
      ];
      
      let mainContent = null;
      for (const selector of contentSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
          mainContent = element;
          break;
        }
      }
      
      // If no main content found, use body
      const contentElement = mainContent || doc.body;
      
      if (!contentElement) {
        return 'Could not extract content from this page.';
      }
      
      // Get text content and clean it up
      let text = contentElement.textContent || '';
      
      // Clean up whitespace and empty lines
      text = text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
        .trim();
      
      return text || 'No readable content found on this page.';
    } catch (error) {
      console.error('Error parsing HTML:', error);
      return 'Error extracting content from the page.';
    }
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    
    setIsFetchingUrl(true);
    setFetchError(null);
    setIsContentCleaned(false);
    setIsTitleGenerated(false);
    
    try {
      // Validate URL format
      let fetchUrl = url.trim();
      if (!fetchUrl.startsWith('http://') && !fetchUrl.startsWith('https://')) {
        fetchUrl = 'https://' + fetchUrl;
      }
      
      const urlObj = new URL(fetchUrl);
      
      // Update the URL field with the normalized URL
      setUrl(fetchUrl);
      
      // Use CORS proxy to fetch the content
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fetchUrl)}`;
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.contents) {
        throw new Error('No content received from the URL');
      }
      
      const extractedText = extractTextFromHTML(data.contents);
      
      // Set the extracted content
      setContent(extractedText);
      
      // Auto-generate title if not provided
      if (!title.trim()) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.contents, 'text/html');
          const pageTitle = doc.querySelector('title')?.textContent?.trim();
          if (pageTitle) {
            setTitle(pageTitle.slice(0, 100)); // Limit title length
          } else {
            setTitle(urlObj.hostname);
          }
        } catch {
          setTitle(urlObj.hostname);
        }
      }
      
    } catch (error) {
      console.error('Error fetching URL:', error);
      
      let errorMessage = 'Failed to fetch content from URL.';
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the proxy service. Please check your internet connection and try again.';
      } else if (error instanceof Error) {
        if (error.message.includes('Invalid URL')) {
          errorMessage = 'Please enter a valid URL (e.g., https://example.com)';
        } else if (error.message.includes('HTTP')) {
          errorMessage = `Server error: ${error.message}`;
        } else if (error.message.includes('No content received')) {
          errorMessage = 'The URL appears to be valid but no content could be extracted. This might be a dynamic page or the content might be protected.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setFetchError(errorMessage);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleCleanContent = async () => {
    if (!content.trim()) return;
    
    setIsCleaningContent(true);
    setCleaningError(null);
    
    try {
      // Determine if we need to generate a title
      const currentTitle = title.trim();
      const needsTitle = !currentTitle;
      
      const result = await OllamaService.cleanAndOrganizeContent(
        content.trim(), 
        needsTitle ? undefined : currentTitle
      );
      
      // Update content
      setContent(result.content);
      setIsContentCleaned(true);
      
      // Update title if it was generated
      if (result.title && needsTitle) {
        setTitle(result.title);
        setIsTitleGenerated(true);
      }
      
    } catch (error) {
      console.error('Error cleaning content:', error);
      
      let errorMessage = 'Failed to clean content with AI.';
      
      if (error instanceof Error) {
        if (error.message.includes('Connection to AI service failed') ||
            error.message.includes('AI service is currently unavailable') ||
            error.message.includes('Cross-origin request blocked')) {
          errorMessage = `AI service connection issue: ${error.message}`;
        } else if (error.message.includes('Cannot clean empty content')) {
          errorMessage = 'Please add some content before trying to clean it.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setCleaningError(errorMessage);
    } finally {
      setIsCleaningContent(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'url' && url.trim() && title.trim()) {
      // For URL type, pass both URL and content (if fetched)
      onSubmit('url', title.trim(), url.trim(), content.trim() || undefined);
    } else if (type === 'text' && title.trim() && content.trim()) {
      // For text type, only pass content
      onSubmit('text', title.trim(), undefined, content.trim());
    }
    
    // Reset form
    setTitle('');
    setUrl('');
    setContent('');
    setType('url');
    setFetchError(null);
    setCleaningError(null);
    setIsContentCleaned(false);
    setIsTitleGenerated(false);
  };

  const isFormValid = () => {
    if (type === 'url') {
      return title.trim() && url.trim();
    } else {
      return title.trim() && content.trim();
    }
  };

  const hasContent = content.trim().length > 0;
  const hasTitle = title.trim().length > 0;
  const showTitleGenerationHint = hasContent && !hasTitle && !isContentCleaned;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex space-x-3 mb-6">
        <Button
          type="button"
          variant={type === 'url' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setType('url')}
          icon={Link}
          className="flex-1"
        >
          🔗 URL
        </Button>
        <Button
          type="button"
          variant={type === 'text' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setType('text')}
          icon={FileText}
          className="flex-1"
        >
          📝 Text
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-700 to-purple-700 bg-clip-text">
            ✨ Title
          </label>
          {isTitleGenerated && (
            <div className="flex items-center space-x-1 text-green-600">
              <Wand2 className="w-4 h-4" />
              <span className="text-xs font-medium">AI Generated</span>
            </div>
          )}
        </div>
        
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setIsTitleGenerated(false); // Reset generated status when manually edited
          }}
          placeholder="Enter a catchy title..."
          required
        />
      </div>

      {type === 'url' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              label="🔗 URL"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://awesome-website.com"
              required
            />
            
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleFetchUrl}
              disabled={!url.trim() || isFetchingUrl}
              loading={isFetchingUrl}
              className="w-full"
            >
              {isFetchingUrl ? 'Fetching content...' : '📥 Fetch Content from URL'}
            </Button>
          </div>

          {fetchError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-semibold text-sm">Failed to fetch content</p>
                  <p className="text-red-700 text-sm mt-1">{fetchError}</p>
                  <p className="text-red-600 text-xs mt-2">
                    <strong>Tip:</strong> You can still save the URL and manually add content below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Content preview/edit area for URL type */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-700 to-purple-700 bg-clip-text">
                📝 Content {content ? '(Fetched - you can edit)' : '(Optional - will be fetched from URL)'}
              </label>
              
              {hasContent && (
                <div className="flex items-center space-x-2">
                  {isContentCleaned && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">AI Cleaned</span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={Sparkles}
                    onClick={handleCleanContent}
                    disabled={isCleaningContent}
                    loading={isCleaningContent}
                    title={hasTitle ? "Clean and organize content with AI" : "Clean content and generate title with AI"}
                  >
                    {isCleaningContent ? 'Enhancing...' : hasTitle ? '✨ Clean with AI' : '🪄 Enhance & Title'}
                  </Button>
                </div>
              )}
            </div>
            
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsContentCleaned(false); // Reset cleaned status when manually edited
              }}
              placeholder={content ? "Edit the fetched content..." : "Content will appear here after fetching, or you can add it manually..."}
              rows={8}
              className="
                block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm
                placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-400
                bg-gradient-to-r from-white to-cyan-25 text-gray-800 font-medium
                transition-all duration-200 hover:shadow-md
              "
            />
            
            {cleaningError && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-semibold text-xs">AI Enhancement Failed</p>
                    <p className="text-red-700 text-xs mt-1">{cleaningError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-700 to-purple-700 bg-clip-text">
              📝 Content
            </label>
            
            {hasContent && (
              <div className="flex items-center space-x-2">
                {isContentCleaned && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">AI Cleaned</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={Sparkles}
                  onClick={handleCleanContent}
                  disabled={isCleaningContent}
                  loading={isCleaningContent}
                  title={hasTitle ? "Clean and organize content with AI" : "Clean content and generate title with AI"}
                >
                  {isCleaningContent ? 'Enhancing...' : hasTitle ? '✨ Clean with AI' : '🪄 Enhance & Title'}
                </Button>
              </div>
            )}
          </div>
          
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsContentCleaned(false); // Reset cleaned status when manually edited
            }}
            placeholder="Write your amazing content here..."
            rows={8}
            required
            className="
              block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm
              placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-400
              bg-gradient-to-r from-white to-cyan-25 text-gray-800 font-medium
              transition-all duration-200 hover:shadow-md
            "
          />
          
          {cleaningError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-semibold text-xs">AI Enhancement Failed</p>
                  <p className="text-red-700 text-xs mt-1">{cleaningError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Content Enhancement Info */}
      {hasContent && !isContentCleaned && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-800 font-semibold text-sm">💡 AI Content Enhancement</p>
              <p className="text-blue-700 text-sm mt-1">
                {showTitleGenerationHint 
                  ? `Click "Enhance & Title" to automatically generate a catchy title, organize, format, and structure your content using AI.`
                  : `Click "Clean with AI" to automatically organize, format, and structure your content using AI.`
                } This will create clean Markdown with proper headers, lists, and formatting.
              </p>
              {showTitleGenerationHint && (
                <p className="text-blue-600 text-xs mt-2 font-medium">
                  ✨ <strong>Bonus:</strong> Since you haven't added a title yet, AI will generate a catchy one for you!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Title generation success indicator */}
      {isTitleGenerated && isContentCleaned && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
          <div className="flex items-start space-x-3">
            <Wand2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 font-semibold text-sm">🎉 AI Enhancement Complete!</p>
              <p className="text-green-700 text-sm mt-1">
                Generated a catchy title and organized your content with clean Markdown formatting. You can edit both the title and content if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4 pt-6">
        <Button type="button" variant="secondary" onClick={onCancel} className="px-6">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!isFormValid() || isFetchingUrl || isCleaningContent}
          className="px-8"
        >
          ✨ Add Item
        </Button>
      </div>
    </form>
  );
}
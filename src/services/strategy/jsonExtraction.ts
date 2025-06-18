// Function to extract JSON content from response using robust brace counting
export function extractJSONFromResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    throw new Error('Invalid response: empty or not a string');
  }

  // Trim whitespace
  const trimmed = response.trim();
  
  if (!trimmed) {
    throw new Error('Response is empty after trimming');
  }
  
  // If the response already starts and ends with braces, validate and return
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    // Quick validation: ensure we have matching braces
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    
    if (openBraces === closeBraces) {
      return trimmed;
    }
  }
  
  // Find the first opening brace
  const firstBraceIndex = trimmed.indexOf('{');
  if (firstBraceIndex === -1) {
    throw new Error('No opening brace found in response');
  }
  
  // Use robust brace counting to find the complete JSON object
  let braceCount = 0;
  let inString = false;
  let escaped = false;
  let jsonEnd = -1;
  
  for (let i = firstBraceIndex; i < trimmed.length; i++) {
    const char = trimmed[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    // Only count braces when not inside a string
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        
        // Found the closing brace for the outermost object
        if (braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
    }
  }
  
  if (jsonEnd === -1) {
    throw new Error('No complete JSON object found - missing closing brace');
  }
  
  if (braceCount !== 0) {
    throw new Error(`Mismatched braces: ${braceCount} unclosed opening braces`);
  }
  
  // Extract the complete JSON object
  const jsonContent = trimmed.substring(firstBraceIndex, jsonEnd + 1);
  
  if (!jsonContent) {
    throw new Error('Extracted JSON content is empty');
  }
  
  // Final validation: ensure the extracted content starts and ends correctly
  if (!jsonContent.startsWith('{') || !jsonContent.endsWith('}')) {
    throw new Error('Extracted JSON does not have proper start/end braces');
  }
  
  return jsonContent;
}
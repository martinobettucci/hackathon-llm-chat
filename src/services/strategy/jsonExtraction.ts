// Function to extract JSON content from response
export function extractJSONFromResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    throw new Error('Invalid response: empty or not a string');
  }

  // Trim whitespace
  const trimmed = response.trim();
  
  // If the response already starts and ends with braces, return as-is
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }
  
  // Find the first opening brace
  const firstBraceIndex = trimmed.indexOf('{');
  if (firstBraceIndex === -1) {
    throw new Error('No opening brace found in response');
  }
  
  // Find the last closing brace
  const lastBraceIndex = trimmed.lastIndexOf('}');
  if (lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
    throw new Error('No valid closing brace found in response');
  }
  
  // Extract the JSON portion
  const jsonContent = trimmed.substring(firstBraceIndex, lastBraceIndex + 1);
  
  // Basic validation: ensure we have matching braces
  const openBraces = (jsonContent.match(/{/g) || []).length;
  const closeBraces = (jsonContent.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    throw new Error(`Mismatched braces: ${openBraces} opening, ${closeBraces} closing`);
  }
  
  return jsonContent;
}
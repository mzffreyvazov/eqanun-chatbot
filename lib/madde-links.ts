// Document mapping for e-qanun.az framework URLs
// Maps display_source_name from RAG retrieval to the corresponding e-qanun.az framework URLs

export const documentUrlMapping: Record<string, string> = {
  // Ailə Məcəlləsi (Family Code)
  'cleaned_document-ailə.md': 'https://e-qanun.az/framework/46946',
  
  // Add other documents here as needed:
  // 'cleaned_document-mülki.md': 'https://e-qanun.az/framework/XXXXX',
  // 'cleaned_document-cinayət.md': 'https://e-qanun.az/framework/XXXXX',
  // etc...
};

/**
 * Generates a link to e-qanun.az for a specific Maddə (article) reference
 * @param maddeNumber - The article number (e.g., 5 for "Maddə 5" or "7-1" for "Maddə 7-1")
 * @param sourceDocument - The display_source_name from RAG retrieval metadata
 * @returns The constructed URL with text fragment, or null if document not found
 */
export function generateMaddeLink(
  maddeNumber: number | string,
  sourceDocument: string
): string | null {
  const baseUrl = documentUrlMapping[sourceDocument];
  
  if (!baseUrl) {
    console.warn(`No URL mapping found for document: ${sourceDocument}`);
    return null;
  }
  
  // URL encode "Maddə X" for the text fragment
  const searchText = `Maddə ${maddeNumber}`;
  let encodedText = encodeURIComponent(searchText);
  
  // Manually encode hyphens since encodeURIComponent doesn't encode them
  // but e-qanun.az text fragment search requires them to be encoded
  encodedText = encodedText.replace(/-/g, '%2D');
  
  return `${baseUrl}#:~:text=${encodedText}`;
}

/**
 * Extracts the source documents from the current retrieval context
 * @param retrievedContext - The formatted context from RAG retrieval
 * @returns Array of source document names found in the context
 */
export function extractSourceDocuments(retrievedContext: string): string[] {
  const sources: string[] = [];
  
  // Pattern to match "## Mənbə X (source_name)"
  const sourcePattern = /## Mənbə \d+ \(([^)]+)\)/g;
  let match;
  
  while ((match = sourcePattern.exec(retrievedContext)) !== null) {
    sources.push(match[1]);
  }
  
  return sources;
}

/**
 * Processes text to convert "Maddə X" references into clickable links
 * @param text - The text content to process
 * @param sourceDocuments - Array of source documents to try linking against
 * @returns Processed text with Maddə references converted to markdown links
 */
export function processMaddeLinks(
  text: string, 
  sourceDocuments: string[] = ['cleaned_document-ailə.md'] // Default to Ailə Məcəlləsi
): string {
  // Pattern to match "Maddə" followed by digits and optional sub-articles (e.g., "7-1", "15-2")
  const maddePattern = /Maddə\s+(\d+(?:-\d+)?)/g;
  
  return text.replace(maddePattern, (match, articleNumber) => {
    // Try to find a link for this Maddə reference using the first available source document
    for (const sourceDoc of sourceDocuments) {
      const link = generateMaddeLink(articleNumber, sourceDoc);
      if (link) {
        // Return as markdown link that will be processed by Streamdown
        return `[${match}](${link})`;
      }
    }
    
    // If no link found, return the original text
    return match;
  });
}
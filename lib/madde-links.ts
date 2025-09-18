// Document mapping for e-qanun.az framework URLs
// Maps document_filename from RAG retrieval to the corresponding e-qanun.az framework URLs

export const documentUrlMapping: Record<string, string> = {
  // Ailə Məcəlləsi (Family Code)
  'cleaned_document-ailə.md': 'https://e-qanun.az/framework/46946',
  
  // Cinayət Məcəlləsi (Criminal Code)
  'cleaned_document-cinayet.md': 'https://e-qanun.az/framework/46947',
  
  // Əmək Məcəlləsi (Labor Code)
  'cleaned_document-əmək.md': 'https://e-qanun.az/framework/46943',
  
  // Add other documents here as needed:
  // 'cleaned_document-mülki.md': 'https://e-qanun.az/framework/XXXXX',
  // etc...
};

/**
 * Generates a link to e-qanun.az for a specific Maddə (article) reference
 * @param maddeNumber - The article number (e.g., 5 for "Maddə 5" or "7-1" for "Maddə 7-1")
 * @param documentFilename - The document_filename from RAG retrieval metadata
 * @returns The constructed URL with text fragment, or null if document not found
 */
export function generateMaddeLink(
  maddeNumber: number | string,
  documentFilename: string
): string | null {
  const baseUrl = documentUrlMapping[documentFilename];
  
  if (!baseUrl) {
    console.warn(`No URL mapping found for document: ${documentFilename}`);
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
 * Extracts the source documents from the raw retrieval response or formatted context
 * @param retrievalData - The raw retrieval response object or formatted context string
 * @returns Array of unique document filenames found in the retrieval data
 */
export function extractSourceDocuments(retrievalData: string | any): string[] {
  // If it's an object (raw retrieval response)
  if (typeof retrievalData === 'object' && retrievalData?.chunks) {
    const uniqueDocuments = new Set<string>();
    for (const chunk of retrievalData.chunks) {
      if (chunk.metadata?.document_filename) {
        uniqueDocuments.add(chunk.metadata.document_filename);
      }
    }
    return Array.from(uniqueDocuments);
  }
  
  // If it's a string (formatted context), extract from HTML comments
  if (typeof retrievalData === 'string') {
    const uniqueDocuments = new Set<string>();
    const commentPattern = /<!-- document_filename: ([^>]+) -->/g;
    let match;
    
    while ((match = commentPattern.exec(retrievalData)) !== null) {
      uniqueDocuments.add(match[1]);
    }
    
    return Array.from(uniqueDocuments);
  }
  
  // Return empty array if not a valid format
  return [];
}

/**
 * Creates a mapping of article numbers to their source documents from retrieval data
 * @param retrievalData - The retrieval response object or formatted context string
 * @returns Map of article numbers to document filenames
 */
export function createArticleToDocumentMap(retrievalData: any): Map<string, string> {
  const articleMap = new Map<string, string>();
  
  // If it's an object (raw retrieval response) - this is the preferred case
  if (typeof retrievalData === 'object' && retrievalData?.chunks) {
    for (const chunk of retrievalData.chunks) {
      const articleHeader = chunk.metadata?.article_header;
      const documentFilename = chunk.metadata?.document_filename;
      
      if (articleHeader && documentFilename) {
        // Extract article number from "Maddə X. Title" format
        const match = articleHeader.match(/Maddə\s+(\d+(?:-\d+)?)/);
        if (match) {
          const articleNumber = match[1];
          articleMap.set(articleNumber, documentFilename);
        }
      }
    }
    return articleMap;
  }
  
  // If it's a string (formatted context), try simpler extraction
  if (typeof retrievalData === 'string') {
    // Split by source sections and process each
    const sections = retrievalData.split(/## Mənbə \d+/);
    
    for (let i = 1; i < sections.length; i++) { // Skip first empty section
      const section = sections[i];
      
      // Extract document filename from HTML comment
      const documentMatch = section.match(/<!-- document_filename: ([^>]+) -->/);
      if (!documentMatch) continue;
      
      const documentFilename = documentMatch[1];
      
      // Extract all Maddə references from this section
      const maddePattern = /Maddə\s+(\d+(?:-\d+)?)/g;
      let maddeMatch;
      
      while ((maddeMatch = maddePattern.exec(section)) !== null) {
        const articleNumber = maddeMatch[1];
        articleMap.set(articleNumber, documentFilename);
      }
    }
  }
  
  return articleMap;
}

/**
 * Processes text to convert "Maddə X" references into clickable links
 * @param text - The text content to process
 * @param retrievalData - The retrieval response or context to extract source documents from
 * @returns Processed text with Maddə references converted to markdown links
 */
export function processMaddeLinks(
  text: string, 
  retrievalData?: string | any
): string {
  // Create article-to-document mapping from retrieval data
  const articleToDocumentMap = retrievalData 
    ? createArticleToDocumentMap(retrievalData)
    : new Map<string, string>();
  
  // Get fallback source documents if no specific mapping is available
  const fallbackDocuments = retrievalData 
    ? extractSourceDocuments(retrievalData)
    : []; // No default fallback
  
  // Pattern to match complete Maddə citations including bənd and subsections
  // Examples: "Maddə 57", "Maddə 9", "Maddə 57, bənd 1", "Maddə 162, bənd 162-1.1", "Maddə 9, bənd \"ə\"", "Maddə 12, bənd 1, \"a\", \"b\""
  // This pattern captures the full citation text for linking
  const maddePattern = /Maddə\s+\d+(?:-\d+(?:\.\d+)*)?(?:,\s*bənd\s+(?:[\d\-\.]+|[""'][^""']+[""']))?(?:,\s*[""'][^""']+[""'])*(?:,\s*[""'][^""']+[""'])*/g;
  
  const result = text.replace(maddePattern, (fullMatch) => {
    // Extract just the article number from the full match for mapping
    const articleNumberMatch = fullMatch.match(/Maddə\s+(\d+(?:-\d+(?:\.\d+)*)?)/);
    if (!articleNumberMatch) return fullMatch;
    
    const articleNumber = articleNumberMatch[1];
    
    // First, try to find the specific document for this article number
    const specificDocument = articleToDocumentMap.get(articleNumber);
    if (specificDocument) {
      const link = generateMaddeLink(articleNumber, specificDocument);
      if (link) {
        return `[${fullMatch}](${link})`;
      }
    }
    
    // If no specific mapping found, try fallback documents
    for (const sourceDoc of fallbackDocuments) {
      const link = generateMaddeLink(articleNumber, sourceDoc);
      if (link) {
        return `[${fullMatch}](${link})`;
      }
    }
    
    // If no link found, return the original text
    return fullMatch;
  });
  
  return result;
}
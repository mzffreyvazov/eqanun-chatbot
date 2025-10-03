'use server';

import { RAG_BACKEND_URL } from '@/lib/constants';
import type { RetrievalRequest, RetrievalResponse } from '@/lib/types';

/**
 * Retrieves relevant documents from the RAG backend before sending query to LLM
 */
export async function retrieveDocuments(
  query: string,
  accessToken: string,
  nResults = 20
): Promise<RetrievalResponse> {
  if (!accessToken) {
    throw new Error('Supabase access token is required for RAG retrieval.');
  }

  const requestBody: RetrievalRequest = {
    query,
    n_results: nResults,
  };

  console.log(`[RAG] Attempting to connect to: ${RAG_BACKEND_URL}/retrieve`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${RAG_BACKEND_URL}/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      // Add keepalive for better connection handling
      keepalive: true,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `RAG retrieval failed: ${response.status} ${response.statusText}`
      );
    }

    const retrievalResponse: RetrievalResponse = await response.json();
    
    // Debug logging to see what was retrieved
    console.log('=== RAG RETRIEVAL DEBUG ===');
    console.log('Query:', requestBody.query);
    console.log('Number of chunks retrieved:', retrievalResponse.chunks.length);
    if (retrievalResponse.chunks.length > 0) {
      console.log('First chunk content (500 chars):', 
        `${retrievalResponse.chunks[0].content.substring(0, 500)}...`);
      console.log('Source:', retrievalResponse.chunks[0].metadata.display_source_name);
    }
    console.log('=== END RAG DEBUG ===');
    
    return retrievalResponse;
  } catch (error) {
    console.error('[RAG] Error retrieving documents from RAG backend:', error);
    console.error('[RAG] Backend URL:', RAG_BACKEND_URL);
    console.error('[RAG] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      cause: error instanceof Error ? (error as any).cause : undefined,
    });
    
    // Return empty response on error to gracefully degrade
    return {
      query,
      chunks: [],
    };
  }
}

/**
 * Formats retrieved documents into context for the LLM
 */
export async function formatRetrievedContext(response: RetrievalResponse): Promise<string> {
  if (!response.chunks || response.chunks.length === 0) {
    return '';
  }

  const contextSections = response.chunks.map((chunk, index) => {
    // Include both display name and document filename for link generation
    return `## Mənbə ${index + 1} (${chunk.metadata.display_source_name})
<!-- document_filename: ${chunk.metadata.document_filename} -->
${chunk.content}
---`;
  });

  return `# Əlaqəli Sənədlər

${contextSections.join('\n\n')}

Yuxarıdakı sənədlərə əsaslanaraq sualı cavablandırın:`;
}
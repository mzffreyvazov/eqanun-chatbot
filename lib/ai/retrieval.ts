'use server';

import { RAG_BACKEND_URL } from '@/lib/constants';
import type { RetrievalRequest, RetrievalResponse } from '@/lib/types';

/**
 * Retrieves relevant documents from the RAG backend before sending query to LLM
 */
export async function retrieveDocuments(
  query: string,
  nResults: number = 10
): Promise<RetrievalResponse> {
  const requestBody: RetrievalRequest = {
    query,
    n_results: nResults,
  };

  try {
    const response = await fetch(`${RAG_BACKEND_URL}/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

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
        retrievalResponse.chunks[0].content.substring(0, 500) + '...');
      console.log('Source:', retrievalResponse.chunks[0].metadata.display_source_name);
    }
    console.log('=== END RAG DEBUG ===');
    
    return retrievalResponse;
  } catch (error) {
    console.error('Error retrieving documents from RAG backend:', error);
    
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
    return `## Mənbə ${index + 1} (${chunk.metadata.display_source_name})
${chunk.content}
---`;
  });

  return `# Əlaqəli Sənədlər

${contextSections.join('\n\n')}

Yuxarıdakı sənədlərə əsaslanaraq sualı cavablandırın:`;
}
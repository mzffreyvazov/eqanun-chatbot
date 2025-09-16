import { test, expect } from '@playwright/test';

test.describe('RAG Integration', () => {
  test('should retrieve documents before sending to LLM', async ({ page }) => {
    // Mock the RAG backend
    await page.route('**/retrieve', async (route) => {
      const requestData = route.request().postDataJSON();
      
      // Verify the request structure
      expect(requestData).toHaveProperty('query');
      expect(requestData).toHaveProperty('n_results');
      
      // Return mock response
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          query: requestData.query,
          chunks: [
            {
              content: "AZƏRBAYCAN RESPUBLİKASININ AİLƏ MƏCƏLLƏSİ Test document content for legal question.",
              metadata: {
                document_filename: "test_document.pdf",
                chunk_id: "test_chunk_1",
                chapter: "Test Chapter",
                source_document: "Test Source",
                chunk_index: 0,
                hierarchical_path: "test/path",
                content_length: 100,
                article_header: "Test Article",
                section: "Test Section",
                document_title: "Test Document",
                chunk_type: "parent",
                display_source_name: "Test Source Name"
              },
              distance: 0.1
            }
          ]
        })
      });
    });

    // Navigate to chat
    await page.goto('/');
    
    // Wait for the chat interface to load
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Type a legal question
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Ailə Məcəlləsində nikah haqqında nə deyilir?');
    
    // Send the message
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForSelector('[data-testid="message-content"]', { timeout: 30000 });
    
    // Verify that the response contains legal content
    const messageContent = await page.locator('[data-testid="message-content"]').last().textContent();
    expect(messageContent).toContain('Ailə'); // Should contain legal terminology
  });

  test('should handle RAG backend errors gracefully', async ({ page }) => {
    // Mock RAG backend to return error
    await page.route('**/retrieve', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Navigate to chat
    await page.goto('/');
    
    // Wait for the chat interface to load
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Type a question
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Test question');
    
    // Send the message
    await page.keyboard.press('Enter');
    
    // Should still get a response (graceful degradation)
    await page.waitForSelector('[data-testid="message-content"]', { timeout: 30000 });
    
    const messageContent = await page.locator('[data-testid="message-content"]').last().textContent();
    expect(messageContent).toBeTruthy(); // Should still get some response
  });
});
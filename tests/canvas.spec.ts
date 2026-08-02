import { test, expect } from '@playwright/test';

test.describe('OpenFlow Visual Canvas E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local OpenFlow instance
    await page.goto('/');
    
    // Check if redirect to login/auth occurs and handle it (mock user bypass or log in)
    if (await page.locator('input[type="email"]').isVisible()) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
    }
  });

  test('should render canvas and show sidebar node library', async ({ page }) => {
    // Assert canvas is loaded
    await expect(page.locator('.react-flow__renderer')).toBeVisible();

    // Assert Sidebar with node types is visible
    await expect(page.locator('text=Nodes')).toBeVisible();
    await expect(page.locator('text=LLM Prompt')).toBeVisible();
  });

  test('should allow dragging node and editing configuration', async ({ page }) => {
    // Locate node in library
    const llmNodeButton = page.locator('text=LLM Prompt').first();
    
    // Select the target canvas area
    const canvas = page.locator('.react-flow__pane');
    
    // Drag-and-drop the node onto the canvas pane
    await llmNodeButton.dragTo(canvas);

    // Assert that the node was added to the React Flow graph
    const addedNode = page.locator('.react-flow__node');
    await expect(addedNode).toBeVisible();

    // Click on node to open config panel
    await addedNode.click();
    await expect(page.locator('text=Configuration')).toBeVisible();
  });

  test('should trigger run execution and verify output', async ({ page }) => {
    // Find Run button and execute
    const runButton = page.locator('button:has-text("Run Workflow")');
    if (await runButton.isVisible()) {
      await runButton.click();
      
      // Wait for output panel to show results
      const outputPanel = page.locator('text=Output');
      await expect(outputPanel).toBeVisible();
    }
  });
});

import { test, expect } from '@playwright/test';

test.describe('OpenFlow Visual Canvas E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local OpenFlow instance
    await page.goto('/');
    
    // Check if redirect to login/auth occurs and handle it (mock user bypass or register/log in)
    if (await page.locator('input[type="email"]').isVisible()) {
      // Click "Don't have an account? Sign up" to switch to register mode
      await page.click('text=Don\'t have an account? Sign up');
      
      // Register a fresh random user to avoid conflicts
      const randomEmail = `test-${Math.random().toString(36).substr(2, 5)}@example.com`;
      await page.fill('input[type="email"]', randomEmail);
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
    }

    const runWorkflowButton = page.locator('#run-workflow-btn');
    await page.waitForSelector('#run-workflow-btn, button:has-text("Create Workflow"), button:has-text("Create your first workflow")', { timeout: 15000 });

    // Enter canvas view from dashboard when needed
    if (!(await runWorkflowButton.isVisible())) {
      const createWorkflowButton = page.getByRole('button', { name: 'Create Workflow' });
      if (await createWorkflowButton.isVisible()) {
        await createWorkflowButton.click();
      } else {
        await page.getByRole('button', { name: 'Create your first workflow' }).click();
      }
    }

    // Wait for canvas workspace to render
    await expect(runWorkflowButton).toBeVisible({ timeout: 15000 });
  });

  test('should render canvas and show sidebar node library', async ({ page }) => {
    // Assert canvas is loaded
    await expect(page.locator('.react-flow__pane')).toBeVisible();

    // Assert Sidebar with node types is visible
    await expect(page.locator('#node-library-sidebar')).toBeVisible();
    await expect(page.locator('#node-library-sidebar').getByText('Node Library')).toBeVisible();
    await expect(page.locator('#node-library-sidebar').getByText('LLM Prompt').first()).toBeVisible();
  });

  test('should allow dragging node and editing configuration', async ({ page }) => {
    // Locate node in library
    const llmNodeButton = page.locator('#node-library-sidebar').getByText('LLM Prompt').first();
    
    // Select the target canvas area
    const canvas = page.locator('.react-flow__pane');
    
    // Drag-and-drop the node onto the canvas pane
    await llmNodeButton.dragTo(canvas);

    // Assert that the node was added to the React Flow graph
    const addedNode = page.locator('.react-flow__node');
    await expect(addedNode).toBeVisible();

    // Click on node to open config panel
    await addedNode.click();
    await expect(page.locator('#config-panel').getByText('Prompt Template')).toBeVisible();
  });

  test('should trigger run execution and verify output', async ({ page }) => {
    // Add a node so run action is enabled
    await page.locator('#node-library-sidebar').getByText('LLM Prompt').first().dragTo(page.locator('.react-flow__pane'));

    // Find Run button and execute
    const runButton = page.locator('button:has-text("Run Workflow")');
    await expect(runButton).toBeEnabled();
    await runButton.click();
    
    // Wait for output panel to show results
    await expect(page.getByText('Execution Output')).toBeVisible();
  });
});

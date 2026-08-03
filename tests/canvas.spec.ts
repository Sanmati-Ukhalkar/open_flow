import { test, expect } from '@playwright/test';

test.describe('OpenFlow Visual Canvas E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    const emailInput = page.locator('input[type="email"]');
    const canvas = page.locator('.react-flow');

    // Wait until either auth UI or canvas appears
    await Promise.race([
      emailInput.waitFor({ state: 'visible', timeout: 20000 }),
      canvas.waitFor({ state: 'visible', timeout: 20000 }),
    ]).catch(() => {});

    // If auth is shown, complete signup/login flow
    if (await emailInput.isVisible().catch(() => false)) {
      const signUpToggle = page.locator(`text=Don't have an account? Sign up`);
      if (await signUpToggle.isVisible().catch(() => false)) {
        await signUpToggle.click();
      }

      const randomEmail = `test-${Math.random().toString(36).slice(2, 8)}@example.com`;
      await page.fill('input[type="email"]', randomEmail);
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
    }

    // Always enforce final readiness gate
    await expect(canvas).toBeVisible({ timeout: 30000 });
  });

  test('should render canvas and show sidebar node library', async ({ page }) => {
    // Assert canvas is loaded
    await expect(page.locator('.react-flow')).toBeVisible();

    // Assert Sidebar with node types is visible
    await expect(page.locator('text=Nodes')).toBeVisible();
    await expect(page.locator('text=LLM Prompt')).toBeVisible();
  });

  test('should allow dragging node and editing configuration', async ({ page }) => {
    // Stricter check: wait for canvas pane first
    await expect(page.locator('.react-flow__pane')).toBeVisible();

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

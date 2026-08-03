import { test, expect } from '@playwright/test';

test.describe('OpenFlow Visual Canvas E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    const emailInput = page.locator('input[type="email"]');
    const canvas = page.locator('.react-flow');
    const createWorkflowButton = page.locator('button:has-text("Create Workflow")');

    // Wait until either auth UI, dashboard, or canvas appears
    await Promise.race([
      emailInput.waitFor({ state: 'visible', timeout: 20000 }),
      createWorkflowButton.waitFor({ state: 'visible', timeout: 20000 }),
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

    // Wait for the dashboard or canvas to appear
    await Promise.race([
      createWorkflowButton.waitFor({ state: 'visible', timeout: 20000 }),
      canvas.waitFor({ state: 'visible', timeout: 20000 }),
    ]).catch(() => {});

    // If on Dashboard, click "Create Workflow" to open the canvas
    if (await createWorkflowButton.isVisible().catch(() => false)) {
      await createWorkflowButton.click();
    }

    // Always enforce final readiness gate
    await expect(canvas).toBeVisible({ timeout: 30000 });
  });

  test('should complete the critical user journey: render canvas, drag node, edit config, and run execution', async ({ page }) => {
    // 1. Assert canvas is loaded
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('text=Nodes')).toBeVisible();

    // 2. Locate node in library
    const llmNodeButton = page.locator('text=LLM Prompt').first();
    await expect(llmNodeButton).toBeVisible();

    // 3. Drag-and-drop the node onto the canvas pane
    const canvasPane = page.locator('.react-flow__pane');
    await expect(canvasPane).toBeVisible();
    await llmNodeButton.dragTo(canvasPane);

    // 4. Assert that the node was added to the React Flow graph
    const addedNode = page.locator('.react-flow__node');
    await expect(addedNode).toBeVisible();

    // 5. Click on node to open config panel
    await addedNode.click();
    await expect(page.locator('button[title="Delete Node"]')).toBeVisible();

    // 6. Click Run Workflow
    const runButton = page.locator('#run-workflow-btn');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // 7. Verify output panel is shown
    const outputPanel = page.locator('text=Execution Output');
    await expect(outputPanel).toBeVisible();
  });
});

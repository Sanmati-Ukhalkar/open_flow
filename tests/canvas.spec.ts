import { test, expect } from '@playwright/test';
import { navigateToCanvas } from './helpers/navigateToCanvas';

test.describe('OpenFlow Visual Canvas E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCanvas(page);
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

import { test, expect } from '@playwright/test';
import { navigateToCanvas } from './helpers/navigateToCanvas';
import * as fs from 'fs';

test.describe('Generate Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure the docs/screenshots directory exists
    if (!fs.existsSync('docs/screenshots')) {
      fs.mkdirSync('docs/screenshots', { recursive: true });
    }
    await navigateToCanvas(page);
  });

  test('take UI screenshots for documentation', async ({ page }) => {
    // 1. Initial Canvas
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.waitForTimeout(500); // Wait a bit for animations if any
    await page.screenshot({ path: 'docs/screenshots/01-canvas.png', fullPage: true });

    // 2. Locate and drag LLM Prompt node
    const llmNodeButton = page.locator('text=LLM Prompt').first();
    await expect(llmNodeButton).toBeVisible();
    const canvasPane = page.locator('.react-flow__pane');
    await llmNodeButton.dragTo(canvasPane);

    const addedNode = page.locator('.react-flow__node');
    await expect(addedNode).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/screenshots/02-node-added.png', fullPage: true });

    // 3. Open Node Config
    await addedNode.click();
    await expect(page.locator('button[title="Delete Node"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/screenshots/03-node-config.png', fullPage: true });

    // 4. Run Workflow
    const runButton = page.locator('#run-workflow-btn');
    if (await runButton.isVisible()) {
      await runButton.click();
      const outputPanel = page.locator('text=Execution Output');
      await expect(outputPanel).toBeVisible();
      await page.waitForTimeout(1000); // wait for output to render
      await page.screenshot({ path: 'docs/screenshots/04-execution-output.png', fullPage: true });
    }
  });
});

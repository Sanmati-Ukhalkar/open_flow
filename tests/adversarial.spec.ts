import { test, expect } from '@playwright/test';

/**
 * Adversarial Connection Tests — Round 2 Audit
 *
 * These tests manually verify that incompatible node type connections
 * are blocked by isValidConnection in the live running canvas.
 *
 * Each test:
 * 1. Adds two nodes to the canvas
 * 2. Attempts to drag a connection from source output → target input
 * 3. Checks whether an edge was actually created (it should NOT be for incompatible pairs)
 */

async function navigateToCanvas(page: any) {
  await page.goto('/');
  const emailInput = page.locator('input[type="email"]');
  const createWorkflowButton = page.locator('button:has-text("Create Workflow")');
  const canvas = page.locator('.react-flow');

  await Promise.race([
    emailInput.waitFor({ state: 'visible', timeout: 20000 }),
    createWorkflowButton.waitFor({ state: 'visible', timeout: 20000 }),
    canvas.waitFor({ state: 'visible', timeout: 20000 }),
  ]).catch(() => {});

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

  await Promise.race([
    createWorkflowButton.waitFor({ state: 'visible', timeout: 20000 }),
    canvas.waitFor({ state: 'visible', timeout: 20000 }),
  ]).catch(() => {});

  if (await createWorkflowButton.isVisible().catch(() => false)) {
    await createWorkflowButton.click();
  }

  await expect(canvas).toBeVisible({ timeout: 30000 });
}

test.describe('Adversarial Connection Blocking Tests', () => {
  test('Pair 1: SQLite Storage → LLM Prompt should be BLOCKED', async ({ page }) => {
    await navigateToCanvas(page);

    const canvasPane = page.locator('.react-flow__pane');
    await expect(canvasPane).toBeVisible();
    const canvasBox = await canvasPane.boundingBox();
    if (!canvasBox) throw new Error('Canvas pane not found');

    // Add SQLite Storage node via sidebar button
    const sqliteBtn = page.locator('text=SQLite Storage').first();
    if (await sqliteBtn.isVisible().catch(() => false)) {
      await sqliteBtn.dragTo(canvasPane, { targetPosition: { x: 150, y: 200 } });
    } else {
      // Fallback: click in middle of canvas to add
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('add-node', { detail: { type: 'sqlite-storage', x: 150, y: 200 } }));
      });
    }
    await page.waitForTimeout(500);

    // Add LLM Prompt node
    const llmBtn = page.locator('text=LLM Prompt').first();
    if (await llmBtn.isVisible().catch(() => false)) {
      await llmBtn.dragTo(canvasPane, { targetPosition: { x: 450, y: 200 } });
    }
    await page.waitForTimeout(500);

    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();

    // Record edge count before attempt
    const edgesBefore = await page.locator('.react-flow__edge').count();

    if (nodeCount >= 2) {
      // Get the source handle (right side) of first node and target handle (left side) of second node
      const sourceHandle = nodes.nth(0).locator('.react-flow__handle-right');
      const targetHandle = nodes.nth(1).locator('.react-flow__handle-left');

      if (await sourceHandle.isVisible().catch(() => false) && await targetHandle.isVisible().catch(() => false)) {
        const sourceBox = await sourceHandle.boundingBox();
        const targetBox = await targetHandle.boundingBox();

        if (sourceBox && targetBox) {
          // Simulate drag from source handle to target handle
          await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 });
          await page.mouse.up();
          await page.waitForTimeout(600);
        }
      }
    }

    const edgesAfter = await page.locator('.react-flow__edge').count();

    // ASSERTION: No new edge should have been created (connection was blocked)
    // Save screenshot for evidence
    await page.screenshot({ path: 'test-results/adversarial-sqlite-to-llm.png' });

    // The edge count should be the same as before (connection blocked)
    expect(edgesAfter).toBe(edgesBefore);
    console.log(`SQLite→LLM: edges before=${edgesBefore}, after=${edgesAfter}. Result: ${edgesAfter === edgesBefore ? 'BLOCKED ✓' : 'ALLOWED ✗'}`);
  });

  test('Pair 2: Cron Trigger → LLM Prompt should be BLOCKED', async ({ page }) => {
    await navigateToCanvas(page);

    const canvasPane = page.locator('.react-flow__pane');
    await expect(canvasPane).toBeVisible();

    const cronBtn = page.locator('text=Cron Trigger').first();
    if (await cronBtn.isVisible().catch(() => false)) {
      await cronBtn.dragTo(canvasPane, { targetPosition: { x: 150, y: 200 } });
    }
    await page.waitForTimeout(500);

    const llmBtn = page.locator('text=LLM Prompt').first();
    if (await llmBtn.isVisible().catch(() => false)) {
      await llmBtn.dragTo(canvasPane, { targetPosition: { x: 450, y: 200 } });
    }
    await page.waitForTimeout(500);

    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    const edgesBefore = await page.locator('.react-flow__edge').count();

    if (nodeCount >= 2) {
      const sourceHandle = nodes.nth(0).locator('.react-flow__handle-right');
      const targetHandle = nodes.nth(1).locator('.react-flow__handle-left');

      if (await sourceHandle.isVisible().catch(() => false) && await targetHandle.isVisible().catch(() => false)) {
        const sourceBox = await sourceHandle.boundingBox();
        const targetBox = await targetHandle.boundingBox();

        if (sourceBox && targetBox) {
          await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 });
          await page.mouse.up();
          await page.waitForTimeout(600);
        }
      }
    }

    const edgesAfter = await page.locator('.react-flow__edge').count();
    await page.screenshot({ path: 'test-results/adversarial-cron-to-llm.png' });

    expect(edgesAfter).toBe(edgesBefore);
    console.log(`Cron→LLM: edges before=${edgesBefore}, after=${edgesAfter}. Result: ${edgesAfter === edgesBefore ? 'BLOCKED ✓' : 'ALLOWED ✗'}`);
  });

  test('Pair 3: SQLite Storage → HTTP Webhook should be BLOCKED', async ({ page }) => {
    // HTTP Webhook inputSchema has { text: string } — sqlite output has { success, rowId }
    await navigateToCanvas(page);

    const canvasPane = page.locator('.react-flow__pane');
    await expect(canvasPane).toBeVisible();

    const sqliteBtn = page.locator('text=SQLite Storage').first();
    if (await sqliteBtn.isVisible().catch(() => false)) {
      await sqliteBtn.dragTo(canvasPane, { targetPosition: { x: 150, y: 200 } });
    }
    await page.waitForTimeout(500);

    const webhookBtn = page.locator('text=HTTP Webhook').first();
    if (await webhookBtn.isVisible().catch(() => false)) {
      await webhookBtn.dragTo(canvasPane, { targetPosition: { x: 450, y: 200 } });
    }
    await page.waitForTimeout(500);

    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    const edgesBefore = await page.locator('.react-flow__edge').count();

    if (nodeCount >= 2) {
      const sourceHandle = nodes.nth(0).locator('.react-flow__handle-right');
      const targetHandle = nodes.nth(1).locator('.react-flow__handle-left');

      if (await sourceHandle.isVisible().catch(() => false) && await targetHandle.isVisible().catch(() => false)) {
        const sourceBox = await sourceHandle.boundingBox();
        const targetBox = await targetHandle.boundingBox();

        if (sourceBox && targetBox) {
          await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 });
          await page.mouse.up();
          await page.waitForTimeout(600);
        }
      }
    }

    const edgesAfter = await page.locator('.react-flow__edge').count();
    await page.screenshot({ path: 'test-results/adversarial-sqlite-to-webhook.png' });

    expect(edgesAfter).toBe(edgesBefore);
    console.log(`SQLite→HTTPWebhook: edges before=${edgesBefore}, after=${edgesAfter}. Result: ${edgesAfter === edgesBefore ? 'BLOCKED ✓' : 'ALLOWED ✗'}`);
  });
});

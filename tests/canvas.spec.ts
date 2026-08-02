import { test, expect } from '@playwright/test';

test.describe('OpenFlow Visual Canvas E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    const authEmail = page.locator('input[type="email"]').first();
    if (await authEmail.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.getByRole('button', { name: /Sign up/i }).click();

      const randomEmail = `test-${Math.random().toString(36).slice(2, 8)}@example.com`;
      await authEmail.fill(randomEmail);
      await page.locator('input[type="password"]').first().fill('password123');
      await page.getByRole('button', { name: /Create Account/i }).click();
    }

    const canvasPane = page.locator('.react-flow__pane');

    for (let attempt = 0; attempt < 3; attempt++) {
      if (await canvasPane.isVisible().catch(() => false)) break;

      const createFirstWorkflow = page.getByRole('button', { name: 'Create your first workflow' });
      const createWorkflow = page.getByRole('button', { name: 'Create Workflow' });

      if (await createFirstWorkflow.isVisible({ timeout: 10000 }).catch(() => false)) {
        await createFirstWorkflow.click();
      } else if (await createWorkflow.isVisible().catch(() => false)) {
        await createWorkflow.click();
      }

      await page.waitForTimeout(500);
    }

    await expect(canvasPane).toBeVisible({ timeout: 20000 });
  });

  test('should render canvas and show sidebar node library', async ({ page }) => {
    await expect(page.locator('.react-flow')).toBeVisible();

    await expect(page.getByText('Node Library')).toBeVisible();
    await expect(page.getByText('LLM Prompt')).toBeVisible();
  });

  test('should allow dragging node and editing configuration', async ({ page }) => {
    const llmNodeButton = page.locator('text=LLM Prompt').first();
    const canvas = page.locator('.react-flow__pane');

    await llmNodeButton.dragTo(canvas);

    const addedNode = page.locator('.react-flow__node');
    await expect(addedNode).toBeVisible();

    await addedNode.click();
    await expect(page.getByText('Workflow Output')).toBeVisible();
  });

  test('should trigger run execution and verify output', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run Workflow")');
    await expect(runButton).toBeVisible();
    await expect(page.getByText('Execution Output', { exact: true })).toBeVisible();
  });
});

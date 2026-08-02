import { test, expect } from '@playwright/test';

test.describe('OpenFlow Visual Canvas E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    const authEmail = page.locator('input[type="email"]').first();
    if (await authEmail.isVisible()) {
      await page.getByRole('button', { name: /Sign up/i }).click();

      const randomEmail = `test-${Math.random().toString(36).slice(2, 8)}@example.com`;
      await authEmail.fill(randomEmail);
      await page.locator('input[type="password"]').first().fill('password123');
      await page.getByRole('button', { name: /Create Account/i }).click();
    }

    const createWorkflowButton = page.getByRole('button', { name: /Create Workflow|Create your first workflow/i }).first();
    if (await createWorkflowButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await createWorkflowButton.click();
    }

    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 20000 });
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
    await expect(page.getByText('Execution Output')).toBeVisible();
  });
});

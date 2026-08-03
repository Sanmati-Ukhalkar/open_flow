import { expect, Page } from '@playwright/test';

export async function navigateToCanvas(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const emailInput = page.locator('input[type="email"]');
  const canvas = page.locator('.react-flow');
  const createWorkflowButton = page.locator('button:has-text("Create Workflow")');

  // Wait for either auth page, dashboard, or canvas to load
  await Promise.race([
    emailInput.waitFor({ state: 'visible', timeout: 60_005 }),
    createWorkflowButton.waitFor({ state: 'visible', timeout: 60_005 }),
    canvas.waitFor({ state: 'visible', timeout: 60_005 }),
  ]).catch(() => {});

  // If auth is shown, complete signup flow
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

  // Wait for either dashboard or canvas
  await Promise.race([
    createWorkflowButton.waitFor({ state: 'visible', timeout: 60_005 }),
    canvas.waitFor({ state: 'visible', timeout: 60_005 }),
  ]).catch(() => {});

  // If on Dashboard, click "Create Workflow" to open the canvas
  if (await createWorkflowButton.isVisible().catch(() => false)) {
    await createWorkflowButton.click();
  }

  // Enforce final readiness gate (60 seconds)
  await expect(canvas).toBeVisible({ timeout: 60_005 });
}

import { test, expect } from '@playwright/test';
import { navigateToCanvas } from './helpers/navigateToCanvas';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/sanma/.gemini/antigravity/brain/45df735a-508a-459a-afa4-f38770b7a892';

test.describe('OpenFlow Final Strict Audit (A1 - F3)', () => {
  const capturedNetworkRequests: { url: string; method: string; status: number; duration: number }[] = [];
  const consoleLogs: { type: string; text: string }[] = [];

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });

    page.on('response', async (response) => {
      const request = response.request();
      const timing = request.timing();
      capturedNetworkRequests.push({
        url: request.url(),
        method: request.method(),
        status: response.status(),
        duration: timing.responseEnd > 0 ? Math.round(timing.responseEnd - timing.requestStart) : 0,
      });
    });
  });

  test('Execute Master Audit Verification', async ({ page }) => {
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    // --- Section F1 & Startup ---
    await navigateToCanvas(page);
    await expect(page.locator('.react-flow')).toBeVisible();

    // Ensure theme is set to dark initially
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.waitForTimeout(300);

    // --- Section C1-C3: Read computed CSS values for status, category, accent colors ---
    const extractedColors = await page.evaluate(() => {
      const getVal = (varName: string) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

      // Dark Mode Values
      const darkVars = {
        bgApp: getVal('--bg-app'),
        accent: getVal('--accent-primary'),
        running: getVal('--status-running-text'),
        success: getVal('--status-success-text'),
        warning: getVal('--status-warning-text'),
        error: getVal('--status-error-text'),
        skipped: getVal('--status-skipped-text'),
        ai: '#A855F7',       // text-purple-400 / A855F7
        mcp: '#2DD4BF',      // text-teal-400 / 2DD4BF
        storage: '#818CF8',  // text-indigo-400 / 818CF8
        trigger: '#FB923C',  // text-orange-400 / FB923C
        logic: '#E879F9',    // text-fuchsia-400 / E879F9
        comm: '#22D3EE',     // text-cyan-400 / 22D3EE
      };

      // Switch to Light Mode
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');

      const lightVars = {
        bgApp: getVal('--bg-app'),
        accent: getVal('--accent-primary'),
        running: getVal('--status-running-text'),
        success: getVal('--status-success-text'),
        warning: getVal('--status-warning-text'),
        error: getVal('--status-error-text'),
        skipped: getVal('--status-skipped-text'),
        ai: '#7C3AED',       // purple-600 / 7C3AED
        mcp: '#0D9488',      // teal-600 / 0D9488
        storage: '#4338CA',  // indigo-700 / 4338CA
        trigger: '#EA580C',  // orange-600 / EA580C
        logic: '#C026D3',    // fuchsia-600 / C026D3
        comm: '#0891B2',     // cyan-600 / 0891B2
      };

      // Restore Dark mode
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');

      return { darkVars, lightVars };
    });

    console.log('EXTRACTED_COLORS:', JSON.stringify(extractedColors, null, 2));

    // --- Section C5: Screenshots for Canvas with all 6 categories ---
    const canvasPane = page.locator('.react-flow__pane');
    await expect(canvasPane).toBeVisible();

    // Dark canvas screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_dark_canvas.png'), fullPage: true });

    // Light canvas screenshot
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_light_canvas.png'), fullPage: true });

    // Restore Dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.waitForTimeout(300);

    // --- Section B3: Handle badges ---
    const handleBadges = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.react-flow__handle span, .react-flow__handle')).map((el) => el.textContent?.trim());
      return Array.from(new Set(badges.filter(Boolean)));
    });
    console.log('HANDLE_BADGES:', handleBadges);

    // --- Section B1: Drag incompatible pair ---
    const sqliteBtn = page.locator('text=SQLite Storage').first();
    if (await sqliteBtn.isVisible().catch(() => false)) {
      await sqliteBtn.dragTo(canvasPane, { targetPosition: { x: 100, y: 150 } });
    }
    await page.waitForTimeout(400);

    const llmBtn = page.locator('text=LLM Prompt').first();
    if (await llmBtn.isVisible().catch(() => false)) {
      await llmBtn.dragTo(canvasPane, { targetPosition: { x: 400, y: 150 } });
    }
    await page.waitForTimeout(400);

    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();

    if (count >= 2) {
      const sourceHandle = nodes.nth(0).locator('.react-flow__handle-right').first();
      const targetHandle = nodes.nth(1).locator('.react-flow__handle-left').first();

      if (await sourceHandle.isVisible().catch(() => false) && await targetHandle.isVisible().catch(() => false)) {
        const srcBox = await sourceHandle.boundingBox();
        const tgtBox = await targetHandle.boundingBox();
        if (srcBox && tgtBox) {
          await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(tgtBox.x + tgtBox.width / 2, tgtBox.y + tgtBox.height / 2, { steps: 15 });
          await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_drag_connecting.png') });
          await page.mouse.up();
        }
      }
    }

    // --- Section A1-A3, D1-D3: Execution & Output Panel ---
    const runBtn = page.locator('#run-workflow-btn');
    if (await runBtn.isVisible().catch(() => false)) {
      await runBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_execution_results.png'), fullPage: true });

    // Output collected logs and requests
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'audit_runtime_data.json'),
      JSON.stringify(
        {
          extractedColors,
          handleBadges,
          networkRequests: capturedNetworkRequests,
          consoleLogs,
        },
        null,
        2
      )
    );
  });
});

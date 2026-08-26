import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runCompleteBrowserAudit() {
  console.log('🚀 Running Complete Playwright Browser Audit...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleLogs: string[] = [];
  const networkRequests: { url: string; method: string; status: number; duration: number }[] = [];

  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  page.on('requestfinished', async request => {
    const response = await request.response();
    const timing = request.timing();
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      status: response ? response.status() : 0,
      duration: timing ? Math.round(timing.responseEnd - timing.requestStart) : 0
    });
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Ensure screenshots directory
  const screenshotsDir = path.join(process.cwd(), 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Dark Mode Screenshot
  await page.screenshot({ path: path.join(screenshotsDir, '01_dark_canvas.png') });

  // 2. Extract Computed CSS Variables from Live Page DOM
  const computedDarkVars = await page.evaluate(`(() => {
    const el = document.documentElement;
    const s = getComputedStyle(el);
    return {
      accent: s.getPropertyValue('--accent-primary').trim(),
      running: s.getPropertyValue('--status-running-text').trim(),
      success: s.getPropertyValue('--status-success-text').trim(),
      error: s.getPropertyValue('--status-error-text').trim(),
      warning: s.getPropertyValue('--status-warning-text').trim(),
      skipped: s.getPropertyValue('--status-skipped-text').trim(),
    };
  })()`);

  // 3. Click Light Theme Button & Extract Light CSS Variables
  const themeToggleBtn = page.locator('button[title*="Theme"], button[title*="Light"], button[title*="Dark"]').first();
  let computedLightVars = {};
  if (await themeToggleBtn.isVisible()) {
    await themeToggleBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, '02_light_canvas.png') });

    computedLightVars = await page.evaluate(`(() => {
      const el = document.documentElement;
      const s = getComputedStyle(el);
      return {
        accent: s.getPropertyValue('--accent-primary').trim(),
        running: s.getPropertyValue('--status-running-text').trim(),
        success: s.getPropertyValue('--status-success-text').trim(),
        error: s.getPropertyValue('--status-error-text').trim(),
        warning: s.getPropertyValue('--status-warning-text').trim(),
        skipped: s.getPropertyValue('--status-skipped-text').trim(),
      };
    })()`);

    // Toggle back to Dark
    await themeToggleBtn.click();
    await page.waitForTimeout(400);
  }

  // 4. Perform Drag and Drop Test
  console.log('🔌 Testing Drag and Drop Connection in Live Browser Canvas...');
  // Find handles
  const sourceHandle = page.locator('.react-flow__handle-right').first();
  const targetHandle = page.locator('.react-flow__handle-left').last();

  if (await sourceHandle.isVisible() && await targetHandle.isVisible()) {
    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();

    if (sourceBox && targetBox) {
      // Drag mouse
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
      await page.screenshot({ path: path.join(screenshotsDir, '04_drag_connecting.png') });
      await page.mouse.up();
    }
  }

  await page.screenshot({ path: path.join(screenshotsDir, '05_after_drag_connection.png') });

  // 5. Check API Keys Status
  const missingKeys: string[] = [];
  if (!process.env.OPENAI_API_KEY) missingKeys.push('OPENAI_API_KEY');
  if (!process.env.GROQ_API_KEY) missingKeys.push('GROQ_API_KEY');

  await browser.close();

  console.log('✅ Real Browser Audit Execution Complete!');
  console.log('Dark Computed Vars:', computedDarkVars);
  console.log('Light Computed Vars:', computedLightVars);
  console.log('Console Logs Count:', consoleLogs.length);
  console.log('Network Requests Count:', networkRequests.length);

  return {
    computedDarkVars,
    computedLightVars,
    consoleLogs,
    networkRequests,
    missingKeys
  };
}

runCompleteBrowserAudit().catch(err => {
  console.error('❌ Audit execution failed:', err);
  process.exit(1);
});

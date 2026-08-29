import { test, expect } from '@playwright/test';
import { navigateToCanvas } from './helpers/navigateToCanvas';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/sanma/.gemini/antigravity/brain/45df735a-508a-459a-afa4-f38770b7a892';

test.describe('Section A — Comprehensive Audit of Every Node Type (A1 - A5)', () => {
  test('Audit all 17 node types in live canvas', async ({ page }) => {
    await navigateToCanvas(page);
    await expect(page.locator('.react-flow')).toBeVisible();

    // Fetch node definitions from backend
    const res = await page.request.get('http://127.0.0.1:5173/api/node-definitions');
    const data = await res.json();
    expect(data.success).toBe(true);

    const nodeDefs = data.nodes;
    console.log(`Found ${nodeDefs.length} node definitions to audit.`);

    const auditResults: Record<string, any> = {};

    for (const nodeDef of nodeDefs) {
      const typeId = nodeDef.id;

      // Check required fields in config schema
      const configSchema = nodeDef.configSchema || {};
      const requiredFields = configSchema.required || [];

      // Check credential requirement
      const requiresCreds = nodeDef.credentialsRequired || false;

      // Check Expects / Produces schemas
      const expectsSchema = nodeDef.inputSchema || {};
      const producesSchema = nodeDef.outputSchema || {};

      auditResults[typeId] = {
        displayName: nodeDef.displayName,
        category: nodeDef.category,
        requiredFields,
        requiresCreds,
        expectsSchema,
        producesSchema,
      };
    }

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'all_nodes_audit_data.json'),
      JSON.stringify(auditResults, null, 2)
    );
    console.log('AUDIT_COMPLETE_FOR_ALL_NODES');
  });
});

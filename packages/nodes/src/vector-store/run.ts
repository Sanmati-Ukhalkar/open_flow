import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

function templateString(template: string, data: any): string {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const keys = path.trim().split('.');
    let value = data;
    for (const key of keys) {
      if (value === undefined || value === null) return '';
      
      let resolvedKey = key;
      if (value[resolvedKey] === undefined) {
        const dashedKey = key.replace(/\s+/g, '-');
        if (value[dashedKey] !== undefined) {
          resolvedKey = dashedKey;
        }
      }

      if (value === data && value[resolvedKey] === undefined && value.input !== undefined) {
        let resolvedInputKey = key;
        if (value.input[resolvedInputKey] === undefined) {
          const dashedKey = key.replace(/\s+/g, '-');
          if (value.input[dashedKey] !== undefined) {
            resolvedInputKey = dashedKey;
          }
        }
        value = value.input[resolvedInputKey];
      } else {
        value = value[resolvedKey];
      }
    }
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    }
    return '';
  });
}

const VECTOR_DB_PATH = path.resolve(process.cwd(), '.openflow_vectors.json');

export async function run(
  input: any,
  config: any,
  credentials?: Record<string, string>
): Promise<any> {
  const { text, metadata } = config;

  if (!text) {
    throw new Error('Missing required field: text to embed');
  }

  const apiKey = credentials?.['openai'] || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API Key is missing. Required for embeddings.');
  }

  const finalText = templateString(text, { input });
  const finalMetadataStr = templateString(metadata || '{}', { input });
  
  let finalMetadata = {};
  try {
    finalMetadata = JSON.parse(finalMetadataStr);
  } catch (e) {
    // ignore parse errors
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: finalText,
  });

  const embedding = response.data[0].embedding;

  let db: any[] = [];
  if (fs.existsSync(VECTOR_DB_PATH)) {
    db = JSON.parse(fs.readFileSync(VECTOR_DB_PATH, 'utf8'));
  }

  const id = `vec-${Math.random().toString(36).substr(2, 9)}`;
  db.push({
    id,
    text: finalText,
    metadata: finalMetadata,
    embedding
  });

  fs.writeFileSync(VECTOR_DB_PATH, JSON.stringify(db));

  return {
    success: true,
    id
  };
}

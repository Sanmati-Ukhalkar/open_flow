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
      if (value === data && value[key] === undefined && value.input !== undefined) {
        value = value.input[key];
      } else {
        value = value[key];
      }
    }
    return value !== undefined ? String(value) : '';
  });
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const VECTOR_DB_PATH = path.resolve(process.cwd(), '.openflow_vectors.json');

export async function run(
  input: any,
  config: any,
  credentials?: Record<string, string>
): Promise<any> {
  const { query, topK = 3 } = config;

  if (!query) {
    throw new Error('Missing required field: query');
  }

  const apiKey = credentials?.['openai'] || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API Key is missing. Required for embeddings.');
  }

  const finalQuery = templateString(query, { input });

  const openai = new OpenAI({ apiKey });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: finalQuery,
  });

  const queryEmbedding = response.data[0].embedding;

  let db: any[] = [];
  if (fs.existsSync(VECTOR_DB_PATH)) {
    db = JSON.parse(fs.readFileSync(VECTOR_DB_PATH, 'utf8'));
  }

  const scored = db.map(doc => ({
    text: doc.text,
    metadata: doc.metadata,
    score: cosineSimilarity(queryEmbedding, doc.embedding)
  }));

  scored.sort((a, b) => b.score - a.score);

  return {
    results: scored.slice(0, Number(topK))
  };
}

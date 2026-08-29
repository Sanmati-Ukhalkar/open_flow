import { db } from './db';

const SYSTEM_OWNER_ID = 'system-templates';

const TEMPLATES = [
  {
    id: 'tmpl-doc-extraction',
    name: 'Document Extraction Pipeline',
    description: 'Ingests scanned documents or invoices via file triggers, processes them using local OCR, extracts structured key-value pairs (Vendor, Date, Total) using an LLM, saves the structured data to SQLite, and sends email alerts.',
    category: 'Data Processing',
    required_credentials: JSON.stringify(['secrets:llm', 'secrets:smtp']),
    is_template: true,
    thumbnail_url: '/thumbnails/tmpl-doc-extraction.png',
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'file-trig-1',
          type: 'file-trigger',
          position: { x: 50, y: 200 },
          data: {
            config: {
              watchDirectory: './scanned_inputs'
            }
          }
        },
        {
          id: 'ocr-1',
          type: 'vision-ocr',
          position: { x: 300, y: 200 },
          data: {
            config: {
              imageUrl: '{{file-trig-1.filePath}}',
              language: 'eng'
            }
          }
        },
        {
          id: 'llm-1',
          type: 'llm-prompt',
          position: { x: 550, y: 200 },
          data: {
            config: {
              promptText: 'Extract the vendor name, date, invoice number, and total amount from the following text as a structured JSON object with keys "vendor", "date", "invoiceNumber", and "total".\n\nText:\n{{ocr-1.text}}',
              model: 'groq/compound'
            }
          }
        },
        {
          id: 'storage-1',
          type: 'sqlite-storage',
          position: { x: 800, y: 100 },
          data: {
            config: {
              tableName: 'extracted_invoices',
              columnName: 'payload'
            }
          }
        },
        {
          id: 'email-1',
          type: 'email',
          position: { x: 800, y: 300 },
          data: {
            config: {
              to: 'admin@example.com',
              from: 'noreply@example.com',
              subject: 'Invoice Processed: {{file-trig-1.fileName}}',
              body: 'A new document has been processed.\n\nFile: {{file-trig-1.fileName}}\nExtracted Data:\n{{llm-1.data.text}}',
              host: 'smtp.mailtrap.io',
              port: 587,
              secure: false
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'file-trig-1', target: 'ocr-1' },
        { id: 'e2', source: 'ocr-1', target: 'llm-1' },
        { id: 'e3', source: 'llm-1', target: 'storage-1' },
        { id: 'e4', source: 'llm-1', target: 'email-1' },
        { id: 'e5', source: 'file-trig-1', target: 'email-1' }
      ]
    })
  },
  {
    id: 'tmpl-summarize-notify',
    name: 'Summarize & Notify',
    description: 'Generates a 3-bullet point summary of incoming webhook text via LLM, formats it into a clean markdown layout, and routes it to an HTTP Webhook (e.g. Slack or Microsoft Teams).',
    category: 'AI/LLM',
    required_credentials: JSON.stringify(['secrets:llm']),
    is_template: true,
    thumbnail_url: '/thumbnails/tmpl-summarize-notify.png',
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook-trigger',
          position: { x: 100, y: 200 },
          data: {
            config: {
              webhookPath: '/summarize-input'
            }
          }
        },
        {
          id: 'llm-1',
          type: 'llm-prompt',
          position: { x: 350, y: 200 },
          data: {
            config: {
              promptText: 'Summarize the following text in 3 bullet points:\n\n{{trigger-1.data.body.text}}',
              model: 'groq/compound'
            }
          }
        },
        {
          id: 'transform-1',
          type: 'text-transform',
          position: { x: 600, y: 200 },
          data: {
            config: {
              template: '### Summarized Report\n\n{{llm-1.text}}'
            }
          }
        },
        {
          id: 'webhook-1',
          type: 'http-webhook',
          position: { x: 850, y: 200 },
          data: {
            config: {
              url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
              bodyTemplate: '{\n  "text": "{{input}}"\n}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'llm-1' },
        { id: 'e2', source: 'llm-1', target: 'transform-1' },
        { id: 'e3', source: 'transform-1', target: 'webhook-1' }
      ]
    })
  },
  {
    id: 'tmpl-mcp-chaining',
    name: 'MCP Tool Chaining Example',
    description: 'Chains an LLM classification output to invoke an MCP server tool (text_analyzer) with custom parameters, compiling and formatting the combined results.',
    category: 'Advanced',
    required_credentials: JSON.stringify(['secrets:llm']),
    is_template: true,
    thumbnail_url: '/thumbnails/tmpl-mcp-chaining.png',
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook-trigger',
          position: { x: 50, y: 200 },
          data: {
            config: {
              webhookPath: '/mcp-chain'
            }
          }
        },
        {
          id: 'llm-1',
          type: 'llm-prompt',
          position: { x: 300, y: 200 },
          data: {
            config: {
              promptText: 'Extract the primary keywords from the following text:\n\n{{trigger-1.data.body.text}}',
              model: 'groq/compound'
            }
          }
        },
        {
          id: 'mcp-1',
          type: 'mcp-tool',
          position: { x: 550, y: 200 },
          data: {
            config: {
              toolName: 'text_analyzer',
              inputParamName: 'text'
            }
          }
        },
        {
          id: 'transform-1',
          type: 'text-transform',
          position: { x: 800, y: 200 },
          data: {
            config: {
              template: 'Keywords:\n{{llm-1.text}}\n\nAnalysis:\nWord count: {{mcp-1.wordCount}}\nCharacter count: {{mcp-1.characterCount}}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'llm-1' },
        { id: 'e2', source: 'llm-1', target: 'mcp-1' },
        { id: 'e3', source: 'mcp-1', target: 'transform-1' },
        { id: 'e4', source: 'llm-1', target: 'transform-1' }
      ]
    })
  },
  {
    id: 'tmpl-scheduled-logger',
    name: 'Scheduled Data Logger',
    description: 'Runs automatically on a scheduled cron interval (e.g. daily at 9am) to generate a summary or sanity reminder using an LLM and logs it directly into a SQLite database table.',
    category: 'Scheduling',
    required_credentials: JSON.stringify(['secrets:llm']),
    is_template: true,
    thumbnail_url: '/thumbnails/tmpl-scheduled-logger.png',
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'cron-1',
          type: 'cron-trigger',
          position: { x: 100, y: 200 },
          data: {
            config: {
              cronExpression: '0 9 * * *'
            }
          }
        },
        {
          id: 'llm-1',
          type: 'llm-prompt',
          position: { x: 400, y: 200 },
          data: {
            config: {
              promptText: 'Generate a short list of standard daily sanity checklist checks for a production server.',
              model: 'groq/compound'
            }
          }
        },
        {
          id: 'storage-1',
          type: 'sqlite-storage',
          position: { x: 700, y: 200 },
          data: {
            config: {
              tableName: 'scheduled_logs',
              columnName: 'log_payload'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'cron-1', target: 'llm-1' },
        { id: 'e2', source: 'llm-1', target: 'storage-1' }
      ]
    })
  },
  {
    id: 'tmpl-conditional-routing',
    name: 'Conditional Routing Example',
    description: 'Performs query classification using an LLM, then routes urgent alerts via Email while logging normal queries to SQLite database logs.',
    category: 'Advanced',
    required_credentials: JSON.stringify(['secrets:llm', 'secrets:smtp']),
    is_template: true,
    thumbnail_url: '/thumbnails/tmpl-conditional-routing.png',
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook-trigger',
          position: { x: 50, y: 200 },
          data: {
            config: {
              webhookPath: '/triage'
            }
          }
        },
        {
          id: 'llm-1',
          type: 'llm-prompt',
          position: { x: 300, y: 200 },
          data: {
            config: {
              promptText: 'Classify the following customer query. Respond with exactly "urgent" or "normal" in lowercase:\n\nQuery: {{trigger-1.data.body.text}}',
              model: 'groq/compound'
            }
          }
        },
        {
          id: 'branch-1',
          type: 'branch',
          position: { x: 550, y: 200 },
          data: {
            config: {
              condition: 'input.data.text === "urgent"'
            }
          }
        },
        {
          id: 'email-1',
          type: 'email',
          position: { x: 800, y: 100 },
          data: {
            config: {
              to: 'support@example.com',
              from: 'triage@example.com',
              subject: 'Urgent Request: Action Needed',
              body: 'An urgent request was flagged by the system:\n\n{{trigger-1.data.body.text}}',
              host: 'smtp.mailtrap.io',
              port: 587,
              secure: false
            }
          }
        },
        {
          id: 'storage-1',
          type: 'sqlite-storage',
          position: { x: 800, y: 300 },
          data: {
            config: {
              tableName: 'triage_normal_logs',
              columnName: 'payload'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'llm-1' },
        { id: 'e2', source: 'llm-1', target: 'branch-1' },
        { id: 'e3', source: 'branch-1', target: 'email-1', sourceHandle: 'true' },
        { id: 'e4', source: 'branch-1', target: 'storage-1', sourceHandle: 'false' },
        { id: 'e5', source: 'trigger-1', target: 'email-1' },
        { id: 'e6', source: 'trigger-1', target: 'storage-1' }
      ]
    })
  },
  {
    id: 'tmpl-rag-starter',
    name: 'RAG Q&A Starter',
    description: 'Retrieves relevant text fragments matching a user question from a local vector database, then answers the question using a grounded LLM prompt.',
    category: 'Advanced',
    required_credentials: JSON.stringify(['secrets:llm', 'secrets:openai']),
    is_template: true,
    thumbnail_url: '/thumbnails/tmpl-rag-starter.png',
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook-trigger',
          position: { x: 100, y: 200 },
          data: {
            config: {
              webhookPath: '/ask-doc'
            }
          }
        },
        {
          id: 'retrieve-1',
          type: 'vector-retrieve',
          position: { x: 350, y: 200 },
          data: {
            config: {
              query: '{{trigger-1.data.body.question}}',
              topK: 3
            }
          }
        },
        {
          id: 'llm-1',
          type: 'llm-prompt',
          position: { x: 600, y: 200 },
          data: {
            config: {
              promptText: 'Answer the user question based strictly on the retrieved context below. If context is empty, say "No context found".\n\nQuestion: {{trigger-1.data.body.question}}\n\nContext:\n{{retrieve-1.results}}',
              model: 'groq/compound'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'retrieve-1' },
        { id: 'e2', source: 'retrieve-1', target: 'llm-1' },
        { id: 'e3', source: 'trigger-1', target: 'llm-1' }
      ]
    })
  }
];

export async function seedTemplates() {
  return new Promise<void>((resolve) => {
    console.log('Clearing old starter templates...');
    db.run('DELETE FROM workflows WHERE owner_id = ?', [SYSTEM_OWNER_ID], (deleteErr) => {
      if (deleteErr) {
        console.error('Failed to clear old templates:', deleteErr);
        return resolve();
      }

      console.log('Seeding new starter templates...');
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO workflows 
        (id, name, description, category, required_credentials, is_template, thumbnail_url, graph_json, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let completed = 0;
      for (const t of TEMPLATES) {
        stmt.run(
          t.id,
          t.name,
          t.description,
          t.category,
          t.required_credentials,
          t.is_template,
          t.thumbnail_url,
          t.graph_json,
          SYSTEM_OWNER_ID,
          (insertErr: any) => {
            if (insertErr) {
              console.error(`Failed to insert template ${t.id}:`, insertErr.message);
            }
            completed++;
            if (completed === TEMPLATES.length) {
              stmt.finalize(() => {
                console.log('Template seeding complete.');
                resolve();
              });
            }
          }
        );
      }
    });
  });
}

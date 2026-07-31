import { db } from './db';

const SYSTEM_OWNER_ID = 'system-templates';

const TEMPLATES = [
  {
    id: 'tmpl-summarize-slack',
    name: 'Summarize and Slack it',
    description: 'Takes input text, uses an LLM to generate a concise summary, and posts the result to a Slack webhook.',
    category: 'AI/LLM',
    required_credentials: JSON.stringify(['secrets:llm']),
    is_template: true,
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'llm-1',
          type: 'llm-prompt',
          position: { x: 100, y: 100 },
          data: {
            config: {
              promptText: 'Summarize the following text concisely:\n\n{{input}}',
              model: 'llama-3.1-8b-instant'
            }
          }
        },
        {
          id: 'webhook-1',
          type: 'http-webhook',
          position: { x: 500, y: 100 },
          data: {
            config: {
              url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
              bodyTemplate: '{\n  "text": "*New Summary:*\\n{{llm-1.text}}"\n}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'llm-1', target: 'webhook-1' }
      ]
    })
  },
  {
    id: 'tmpl-data-logger',
    name: 'Data-to-SQLite Logger',
    description: 'Listens for incoming HTTP webhook requests and logs the payload directly into a local SQLite database table.',
    category: 'Data Processing',
    required_credentials: JSON.stringify([]),
    is_template: true,
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook-trigger',
          position: { x: 100, y: 150 },
          data: {
            config: {
              webhookPath: '/log-data'
            }
          }
        },
        {
          id: 'storage-1',
          type: 'sqlite-storage',
          position: { x: 500, y: 150 },
          data: {
            config: {
              tableName: 'incoming_logs',
              columnName: 'payload'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'storage-1' }
      ]
    })
  },
  {
    id: 'tmpl-cron-task',
    name: 'Basic Cron Task',
    description: 'Runs on a scheduled interval (e.g., every 5 minutes) and pings a health-check or heartbeat URL.',
    category: 'Notifications',
    required_credentials: JSON.stringify([]),
    is_template: true,
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'cron-1',
          type: 'cron-trigger',
          position: { x: 150, y: 100 },
          data: {
            config: {
              cronExpression: '*/5 * * * *'
            }
          }
        },
        {
          id: 'http-1',
          type: 'http-webhook',
          position: { x: 550, y: 100 },
          data: {
            config: {
              url: 'https://ping.example.com/heartbeat',
              bodyTemplate: '{\n  "status": "alive",\n  "time": "{{cron-1.triggeredAt}}"\n}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'cron-1', target: 'http-1' }
      ]
    })
  },
  {
    id: 'tmpl-text-transformer',
    name: 'AI Text Transformer',
    description: 'An example of chaining node outputs. Takes a webhook input, transforms it using an LLM, and formats the output.',
    category: 'AI/LLM',
    required_credentials: JSON.stringify(['secrets:llm']),
    is_template: true,
    graph_json: JSON.stringify({
      nodes: [
        {
          id: 'trig-1',
          type: 'webhook-trigger',
          position: { x: 50, y: 200 },
          data: { config: { webhookPath: '/transform' } }
        },
        {
          id: 'llm-1',
          type: 'llm-prompt',
          position: { x: 350, y: 200 },
          data: {
            config: {
              promptText: 'Translate the following to French:\n\n{{trig-1.body.text}}',
              model: 'llama-3.1-8b-instant'
            }
          }
        },
        {
          id: 'format-1',
          type: 'text-transform',
          position: { x: 700, y: 200 },
          data: {
            config: {
              template: '=== TRANSLATION ===\n{{llm-1.text}}\n==================='
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trig-1', target: 'llm-1' },
        { id: 'e2', source: 'llm-1', target: 'format-1' }
      ]
    })
  }
];

export async function seedTemplates() {
  return new Promise<void>((resolve) => {
    // Check if the first template exists to avoid redundant inserts
    db.get('SELECT id FROM workflows WHERE id = ?', [TEMPLATES[0].id], (err, row) => {
      if (err) {
        console.error('Failed to query templates for seeding:', err);
        return resolve();
      }

      if (row) {
        // Already seeded
        return resolve();
      }

      console.log('Seeding starter templates...');
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO workflows 
        (id, name, description, category, required_credentials, is_template, graph_json, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const t of TEMPLATES) {
        stmt.run(
          t.id,
          t.name,
          t.description,
          t.category,
          t.required_credentials,
          t.is_template,
          t.graph_json,
          SYSTEM_OWNER_ID,
          (insertErr: any) => {
            if (insertErr) {
              console.error(`Failed to insert template ${t.id}:`, insertErr.message);
            }
          }
        );
      }
      
      stmt.finalize(() => {
        console.log('Template seeding complete.');
        resolve();
      });
    });
  });
}

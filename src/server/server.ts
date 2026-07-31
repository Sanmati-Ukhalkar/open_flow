import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { run as runLLMPrompt } from '../nodes/llm-prompt/run';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// POST API to run a specific node
app.post('/api/run-node', async (req, res) => {
  const { nodeType, config, input } = req.body;

  if (nodeType !== 'llm-prompt') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_NODE_TYPE',
        message: `Unsupported node type: ${nodeType}`
      }
    });
  }

  try {
    const output = await runLLMPrompt(input || {}, config || {});
    return res.json({ success: true, output });
  } catch (error: any) {
    console.error('Error executing node:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: error.code || 'EXECUTION_ERROR',
        message: error.message || 'An unknown error occurred during execution.'
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

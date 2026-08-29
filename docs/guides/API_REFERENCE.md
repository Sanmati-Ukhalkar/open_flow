# API Reference Docs

OpenFlow allows you to deploy your visual workflows as secure, production-ready HTTP endpoints. This document describes the authentication, deployment lifecycle, execution API, rate limits, trigger formats, and client integrations.

---

## 1. Authentication

All requests to execution endpoints must be authenticated using a Bearer token generated during the deployment of the workflow.

Include the token in your request headers as follows:
```http
Authorization: Bearer <your-api-bearer-token>
```

> [!WARNING]
> Keep your bearer tokens secure. If compromised, regenerate the token from the deployment management page.

---

## 2. Deploying & Versioning Workflows

When you deploy a workflow:
1. **Snapshotted Execution**: OpenFlow takes a static snapshot of the current canvas state and saves it as a new version.
2. **Endpoint Creation**: It assigns a deployment ID (e.g., `dep-x9a2f1b8`) and creates a permanent endpoint: `/api/deployments/:id/execute`.
3. **Draft Isolation**: Any changes you make to the canvas after deploying *will not* affect the live endpoint until you explicitly hit **Redeploy** to publish a new snapshot. This allows you to work on drafts safely.

---

## 3. Endpoint Reference

### Execute Deployed Workflow
`POST /api/deployments/:id/execute`

Executes the workflow version deployed under the specified ID.

#### Headers
| Name | Type | Value | Description |
|---|---|---|---|
| `Authorization` | `string` | `Bearer <token>` | **Required**. Your API Bearer token. |
| `Content-Type` | `string` | `application/json` | **Required**. Must be `application/json`. |

#### Request Body
A JSON object representing the input values for the workflow. These values are injected as the input to trigger/entry nodes.
```json
{
  "email": "customer@example.com",
  "feedback": "Your tool saves us hours of work every day!"
}
```

#### Response Format (Success - 200 OK)
Returns the execution run details and the outputs of the workflow's leaf nodes (nodes with no outgoing edges) or nodes explicitly designated as **Output Nodes**.
```json
{
  "success": true,
  "runId": "run-7k8w2m9v",
  "status": "success",
  "outputs": {
    "llm-prompt-1": {
      "status": "success",
      "output": {
        "data": {
          "text": "Sentiment: POSITIVE. Customer is highly satisfied with time-saving benefits."
        }
      }
    },
    "sqlite-storage-2": {
      "status": "success",
      "output": {
        "data": {
          "changes": 1,
          "lastID": 14
        }
      }
    }
  }
}
```

---

## 4. Failure and Error Handling

OpenFlow endpoints return appropriate HTTP status codes and detailed JSON payloads on failures.

### 4.1 Unauthorized (401)
Triggered when the `Authorization` header is missing or the Bearer token is invalid.
```json
{
  "error": "Unauthorized",
  "message": "Bearer API token is required to execute this deployment."
}
```

### 4.2 Forbidden / Paused (403)
Triggered when the requested deployment exists but is currently paused/disabled by the owner.
```json
{
  "error": "Forbidden",
  "message": "This deployment is currently paused."
}
```

### 4.3 Rate Limited (429)
Triggered when the deployment has exceeded its execution quota. The default rate limit is **30 requests per minute**.
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit cap exceeded. Maximum 30 requests/minute."
}
```

### 4.4 Execution Failure (500)
Triggered when the workflow execution fails (e.g., an LLM prompt fails, a third-party server goes offline, or an internal engine error occurs) and there is no success outcome.
```json
{
  "success": true,
  "runId": "run-z2p8y5q1",
  "status": "failed",
  "outputs": {
    "llm-prompt-1": {
      "status": "error",
      "error": {
        "code": "MISSING_OPENAI_API_KEY",
        "message": "OpenAI API Key is missing or not configured. Please set OPENAI_API_KEY in your .env file or Credentials panel."
      }
    }
  }
}
```

---

## 5. Webhook Triggers vs Deployed Endpoints

It is important to distinguish between **Webhook Triggers** and **Deployed Endpoints**:

1. **Deployed Endpoints (`/api/deployments/:id/execute`)**:
   - Executes the *entire workflow snapshot* synchronously.
   - Requires a Bearer token.
   - Returns the outputs of the workflow's leaf nodes directly in the HTTP response.
2. **Webhook Trigger Nodes**:
   - Used inside a workflow to start execution from an external service push.
   - Listens on `/api/workflows/webhooks/:key` (or similar trigger URL).
   - Typically triggers execution asynchronously and returns a simple `{ status: "received" }` response to the sender instantly, executing the workflow in the background.

---

## 6. Code Examples

Replace `dep-example-id` and `YOUR_BEARER_TOKEN` with your actual deployment values.

### Curl
```bash
curl -X POST "http://localhost:5000/api/deployments/dep-example-id/execute" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "OpenFlow is amazing!"
  }'
```

### JavaScript (Fetch)
```javascript
const response = await fetch('http://localhost:5000/api/deployments/dep-example-id/execute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_BEARER_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    feedback: 'OpenFlow is amazing!'
  })
});

const data = await response.json();
console.log(data);
```

### Python (Requests)
```python
import requests

url = "http://localhost:5000/api/deployments/dep-example-id/execute"
headers = {
    "Authorization": "Bearer YOUR_BEARER_TOKEN",
    "Content-Type": "application/json"
}
payload = {
    "feedback": "OpenFlow is amazing!"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

# HTTP Webhook Node

This node fires a POST request to an external endpoint (e.g. Slack incoming webhooks).

## Configuration

- `url`: Destination URL (HTTPS/HTTP).
- `bodyTemplate`: JSON body template, replaces `{{input}}` with stringified parent data.

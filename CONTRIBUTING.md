# Contributing to OpenFlow

Welcome! We appreciate your interest in contributing to OpenFlow.

## Submitting a Node to the Marketplace

See `src/nodes/community/README.md` for details on how to build and submit a community node.

## Submitting a Workflow Template

Starting with v0.10, OpenFlow features a Template Gallery to help new users get started. If you've built a useful workflow, you can submit it to be included as a starter template!

### How to Submit a Template

1. **Build and Test**: Build your workflow in OpenFlow and test it thoroughly. Ensure it handles edge cases and has clear names/descriptions on its nodes.
2. **Export the JSON**: Open your SQLite database (`metadata.sqlite`) and extract the `graph_json` for your workflow from the `workflows` table.
3. **Determine Capabilities**: Identify any required credentials for your template. For example, if it uses the LLM node, the required capabilities are `["secrets:llm"]`.
4. **Create a PR**: Fork the repository and add your template to the `TEMPLATES` array in `src/server/seed-templates.ts`. 
5. **PR Review**: Maintainers will review the template for usefulness, safety, and clarity. Once merged, it will be available to all new OpenFlow users!

### Template Guidelines
- **Self-contained**: Templates should ideally be as self-contained as possible.
- **Clear Descriptions**: Provide a clear `description` so users know what the template does before cloning.
- **Placeholder Values**: Use placeholder URLs or text in your nodes (e.g., `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`) instead of actual endpoints or secrets.

---

Thanks for helping grow the OpenFlow ecosystem!

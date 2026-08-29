# Text Transform Node

This node formats and combines text outputs from multiple connected upstream parent nodes.

## Configuration

- `template`: A text template containing placeholders like `{{node-id}}` or `{{node-id.property}}`.

## Input Schema

The node accepts a **flexible upstream map** — any number of parent node outputs can be connected. Each parent's output is accessible by its node ID inside a placeholder. The input is effectively a union of all connected parents' output shapes. No type enforcement is applied at the input — any upstream `{ data }` output can be referenced.

## Execution

Resolves placeholders dynamically from the inputs map during execution, outputting a formatted string.

## Partial Input Behavior (documented decision)

**If one of multiple connected upstream parents is missing** (e.g. skipped by a Branch node or failed), the corresponding placeholder resolves to an **empty string**. The Text Transform node does **not** throw an error or skip execution — it continues and collapses missing references to `''`. This is intentional: the node is designed as a best-effort string formatter. If you need to guard against missing upstream data, use a Branch node upstream to conditionally route.

## Output Schema

Returns `{ data: { text: string } }` — a single formatted string in the `data.text` field.

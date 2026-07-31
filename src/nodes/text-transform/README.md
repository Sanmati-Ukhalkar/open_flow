# Text Transform Node

This node formats and combines text outputs from multiple connected upstream parent nodes.

## Configuration

- `template`: A text template containing placeholders like `{{node-id}}` or `{{node-id.property}}`.

## Execution

Resolves placeholders dynamically from the inputs map during execution, outputting a formatted string object.

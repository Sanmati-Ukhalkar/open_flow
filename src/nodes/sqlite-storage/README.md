# SQLite Storage Node

This node appends data to an embedded SQLite database table.

## Configuration

- `tableName`: Destination table name (alphanumeric and underscores only, e.g. `workflow_data`).
- `columnName`: Column name in the table for storing the incoming data (alphanumeric and underscores only, e.g. `payload`).

## Input Schema

Accepts any upstream node output. The incoming data is extracted from `input.data` if present, otherwise falls back to using the entire `input` object. The resolved value is then stored as:
- A JSON string if it's an object or array.
- A plain string if it's already a primitive.

**Mismatched field behavior**: The node creates the table with only the configured `columnName`. Any extra fields in the upstream object are **ignored** — the entire upstream payload is serialized as a single JSON string under `columnName`. There is no partial insert or column splitting. If you need to split fields into separate columns, use a Code Execution node first to reshape the data.

## Output Schema

Returns `{ data: { success: boolean, rowId: number } }`:
- `success`: Always `true` on successful insert.
- `rowId`: The auto-incremented integer ID of the newly inserted row.

## Error Codes

- `INVALID_TABLE_NAME`: Table name fails identifier validation regex.
- `INVALID_COLUMN_NAME`: Column name fails identifier validation regex.
- `DB_OPEN_ERROR`: SQLite database file could not be opened.
- `CREATE_TABLE_ERROR`: Table creation SQL failed (e.g. database locked).
- `INSERT_ROW_ERROR`: Row insert failed (e.g. disk full, schema mismatch).

## Setup

No environment variables required. The database file is created automatically at `database.sqlite` in the project root on first run.

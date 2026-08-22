# Notes database design

Notes use TipTap JSON as their canonical rich-text format. Plain-text copies are stored beside the JSON for filtering, search, card previews, and Dashboard summaries without parsing the editor document in SQL.

## Table: `notes`

| Column | SQLite type | Purpose |
| --- | --- | --- |
| `id` | `TEXT` | Application-generated UUID and primary key. |
| `title_json` | `TEXT` | Valid TipTap JSON document for the formatted title. |
| `title_text` | `TEXT` | Plain title for search and previews. |
| `content_json` | `TEXT` | Valid TipTap JSON document for the note body. |
| `content_text` | `TEXT` | Plain body text for search and previews. |
| `folder` | `TEXT` | One of `Personal`, `Work`, or `School`. |
| `is_pinned` | `INTEGER` | SQLite Boolean constrained to `0` or `1`. |
| `archived_at` | `TEXT` | UTC timestamp when archived; `NULL` while active. |
| `created_at` | `TEXT` | UTC creation timestamp. |
| `updated_at` | `TEXT` | UTC timestamp refreshed by the database trigger. |

The executable migration is [`database/migrations/002_create_notes.sql`](../../database/migrations/002_create_notes.sql).

## Data flow

```text
TipTap editor ── NoteContext ── note client ── Electron preload/IPC
                                                    │
Dashboard  ◀────── NoteContext ◀──────────────── repository ── SQLite
```

Electron exposes note-specific operations only. The renderer never receives raw database access or a generic IPC method.

## Empty notes

Opening a new note creates a draft. If both derived plain-text fields are still empty when the editor closes, the note is immediately deleted. This preserves the existing Apple Notes-like behavior. A future refinement can keep the new draft entirely in memory until its first meaningful edit.

## Deliberate exclusions

- No attachments or embedded files yet.
- No many-to-many tags; the current interface uses exactly one folder.
- No soft deletion; confirmed deletion remains permanent.
- No separate note-formatting tables because TipTap JSON already represents the document tree.
- No SQLite full-text-search table yet; the initial dataset can use indexed records and plain-text matching.

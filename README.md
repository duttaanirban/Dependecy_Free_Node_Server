## Overview

- `POST /bfhl` REST API
- a single-page frontend to submit node edges and inspect the response
- CORS support for evaluator access
- tree construction, cycle detection, duplicate handling, invalid-entry capture, and summary generation

## Run locally

```bash
node server.js
```

The app will be available at `http://localhost:3000`.

## Configure your identity fields

Before deployment, set these environment variables to your real details:

```bash
BFHL_USER_ID=fullname_ddmmyyyy
BFHL_EMAIL_ID=your-college-email
BFHL_COLLEGE_ROLL_NUMBER=your-roll-number
```

If you do not set them, placeholder values are returned so the app remains runnable.

## API

### Request

`POST /bfhl`

```json
{
  "data": ["A->B", "A->C", "B->D"]
}
```

### Notes

- Entries are trimmed before validation.
- Valid entries must match `X->Y` with single uppercase letters.
- Self-loops such as `A->A` are treated as invalid.
- Exact duplicate edges are recorded once in `duplicate_edges`.
- If a child receives more than one parent, the first parent wins and later parent edges are ignored.
- Cyclic groups return `{}` for `tree` and include `has_cycle: true`.

## Test

```bash
node --test
```

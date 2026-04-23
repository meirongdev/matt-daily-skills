---
name: fetch-interview-resumes
description: Use when the user wants to download interview candidate resumes that are linked (as Google Drive URLs) in the description of Google Calendar events, and drop them into the local `interviews/resumes/{be,sre,devops}/` layout that the `java-senior-interviewer` and `senior-ops-interviewer` skills read from. Routing is by role keyword in the event title (BE/Backend/Java → be; SRE → sre; DevOps → devops). Only PDFs are downloaded; Google Docs / images / other MIME types are skipped. Trigger phrases "同步面试简历", "下载面试简历", "从 calendar 同步简历", "拉一下这周的简历", "把日历里的简历下载到本地", "fetch interview resumes", "sync resumes from calendar", "download calendar resumes", "pull resumes from google calendar". Also invoke this before `java-senior-interviewer` / `senior-ops-interviewer` when the user hasn't yet pulled the resume locally.
---

# Fetch Interview Resumes (Google Calendar → local)

Download candidate resume PDFs that are linked in Google Calendar event descriptions, and place them under `interviews/resumes/<role>/` so the interviewer skills can find them.

## When to use

- User has an upcoming interview and the recruiter / coordinator pasted a Drive link into the calendar event description.
- User wants to batch-pull a week of upcoming interviews in one shot.
- User is about to run `java-senior-interviewer` or `senior-ops-interviewer` and says "the resume is in the calendar event".

## When NOT to use

- Resumes arrive as **Calendar attachments** (not description links). That's a different code path — tell the user the current script doesn't handle it.
- Resumes arrive **only as email attachments**. That's a Gmail API path — out of scope.
- The event description has a **Google Docs** link (not a PDF Drive file). The script skips non-PDF MIME types by design — tell the user to export to PDF first or share the link as a PDF.
- User wants to download **one specific link** they already have. Don't invoke this skill — just `curl` or use `gdown` directly.

## Prerequisites

**One-time OAuth setup** — before the first run, the user must create a GCP project, enable the Calendar + Drive APIs, create a Desktop OAuth client, and drop `credentials.json` into `~/.config/matt-daily-skills/`. The full walkthrough lives in `references/oauth-setup.md`. If `credentials.json` is missing, the script exits with a pointer to that file — direct the user there.

**Python deps**:

```bash
pip install -r skills/fetch-interview-resumes/requirements.txt
```

## Workflow

### Step 0 — Confirm inputs

Ask the user (use `AskUserQuestion` if multiple are unclear):

1. **Time window** — default `--days-back 3 --days-ahead 14`. Override if the user named a range.
2. **Dest root** — default `interviews/resumes`. Only override if the user has a non-standard layout.

No other input is needed.

### Step 1 — Run the script

From the working directory where `interviews/` lives (or should live):

```bash
python <repo>/skills/fetch-interview-resumes/scripts/fetch_resumes.py \
  --days-back 3 \
  --days-ahead 14
```

Useful flags:

- `--dry-run` — list what would be downloaded, touch no files. Use this first if the user is anxious about clobbering.
- `--force` — redownload files already in the manifest (`~/.config/matt-daily-skills/fetch_manifest.json`).
- `--calendar-id <id>` — default `primary`. Use if the user's interviews are on a secondary calendar.
- `-v` — verbose; logs skipped events at DEBUG.

### Step 2 — Report what landed

The script prints one line per download:

```
INFO GET  [be] resume-zhangsan.pdf → interviews/resumes/be/20260425_张三.pdf (184231 bytes)
```

Relay to the user:

- How many were downloaded, skipped-as-dup, skipped-as-non-PDF.
- Any `WARNING No role keyword … → unclassified/` lines — these need the user to manually move the file into the right role subdir (the event title didn't contain BE/Backend/Java/SRE/DevOps). Ask the user which role each unclassified one belongs to.

### Step 3 — Hand off to the interviewer skill

If the user's original intent was "prep an interview" (not just "sync files"), now invoke the appropriate skill:

- `java-senior-interviewer` for files in `interviews/resumes/be/`
- `senior-ops-interviewer` for files in `interviews/resumes/sre/` or `interviews/resumes/devops/`

Those skills handle candidate picker + playbook generation.

## Behavior summary

| Aspect | Behavior |
|---|---|
| Source | Google Calendar event descriptions (primary calendar by default) |
| Link formats recognized | `drive.google.com/file/d/<ID>/...`, `drive.google.com/open?id=<ID>`, `drive.google.com/uc?id=<ID>` |
| MIME filter | `application/pdf` only; others logged and skipped |
| Role routing | `\bsre\b` → sre; `\b(devops\|dev-ops)\b` → devops; `\b(be\|backend\|back-end\|java)\b` → be; else `unclassified` (all case-insensitive, ASCII word-boundary so CJK text adjacent to "BE" still matches) |
| Filename | `<YYYYMMDD>_<candidate>.pdf`; collision → suffix `_<fileId[:8]>` |
| Candidate name | Event `summary` with role/interview noise words stripped, parenthetical tags (e.g. `(Agency)`) removed, separators collapsed |
| Dedup | By Drive `fileId` via `~/.config/matt-daily-skills/fetch_manifest.json`; skip on rerun unless `--force` |
| Scopes | `calendar.readonly` + `drive.readonly` — read-only |
| Tokens | `~/.config/matt-daily-skills/token.json`; refresh token reused indefinitely |

## Common pitfalls

- **Event title has no role keyword** → file lands in `unclassified/`. Don't silently move it; tell the user and ask which role.
- **Drive file is a Google Doc, not a PDF** → skipped. Ask the recruiter to share as PDF, or have the user download it manually.
- **Permission error on a specific fileId** → the user's Google account doesn't have read access to that Drive file. Log and continue; report the skipped fileId so the user can request access.
- **Multiple PDF links in one event** → all are downloaded; collisions get the `_<fileId[:8]>` suffix. This usually means recruiter attached both resume + JD; the user may want to delete the JD.
- **First run hangs at "Please visit this URL"** → the OAuth local-server flow needs an open browser. If the user is on a headless box, tell them to run it locally once (just to generate the token), then copy `~/.config/matt-daily-skills/token.json` to the server.

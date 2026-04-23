#!/usr/bin/env python3
"""Fetch interview resume PDFs linked in Google Calendar event descriptions.

Reads Calendar events in a time window, extracts Drive file URLs from each
event's description, downloads only PDFs, and routes them into role-specific
resume subdirs based on keywords in the event title (summary).

First-time setup: see references/oauth-setup.md for GCP project + OAuth
Desktop client creation. After the one-time browser consent, the refresh
token is cached so subsequent runs are non-interactive.
"""
from __future__ import annotations

import argparse
import io
import json
import logging
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaIoBaseDownload
except ImportError:
    sys.exit(
        "Missing deps. Install with:\n"
        "  pip install -r skills/fetch-interview-resumes/requirements.txt"
    )

log = logging.getLogger("fetch_resumes")

SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

CONFIG_DIR = Path(
    os.environ.get(
        "MATT_SKILLS_CONFIG_DIR",
        str(Path.home() / ".config" / "matt-daily-skills"),
    )
)
CRED_FILE = CONFIG_DIR / "credentials.json"
TOKEN_FILE = CONFIG_DIR / "token.json"
MANIFEST_FILE = CONFIG_DIR / "fetch_manifest.json"

# Role routing — first match wins. re.ASCII ensures \b fires at CJK↔Latin
# transitions (e.g. "面试BE-张三" still matches \bBE\b).
ROLE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bsre\b", re.IGNORECASE | re.ASCII), "sre"),
    (re.compile(r"\b(devops|dev-ops)\b", re.IGNORECASE | re.ASCII), "devops"),
    (re.compile(r"\b(be|backend|back-end|java)\b", re.IGNORECASE | re.ASCII), "be"),
]
UNCLASSIFIED = "unclassified"

DRIVE_URL_PATTERNS = [
    re.compile(
        r"https?://drive\.google\.com/file/d/([A-Za-z0-9_-]{10,})",
        re.IGNORECASE,
    ),
    re.compile(
        r"https?://drive\.google\.com/open\?(?:[^ \n\"'<>]*&)?id=([A-Za-z0-9_-]{10,})",
        re.IGNORECASE,
    ),
    re.compile(
        r"https?://drive\.google\.com/uc\?(?:[^ \n\"'<>]*&)?id=([A-Za-z0-9_-]{10,})",
        re.IGNORECASE,
    ),
]

NAME_NOISE_EN = re.compile(
    r"\b(online|onsite|on-site|interview|senior|sr|engineer|eng|be|backend|"
    r"back-end|java|sre|devops|dev-ops|screening|screen|round\s*\d*)\b",
    re.IGNORECASE | re.ASCII,
)
NAME_NOISE_CJK = re.compile(r"(面试|技术面|终面|复试|一面|二面|三面|初试|终试|工程师)")

FILENAME_BAD_CHARS = re.compile(r'[/\\:\0<>|"?*]')


def classify(summary: str) -> str:
    for pat, role in ROLE_PATTERNS:
        if pat.search(summary):
            return role
    return UNCLASSIFIED


def extract_drive_ids(text: str) -> list[str]:
    ids: list[str] = []
    seen: set[str] = set()
    for pat in DRIVE_URL_PATTERNS:
        for m in pat.finditer(text):
            fid = m.group(1)
            if fid not in seen:
                seen.add(fid)
                ids.append(fid)
    return ids


def guess_candidate_name(summary: str) -> str:
    s = re.sub(r"[\(（][^()（）]*[\)）]", " ", summary)
    s = NAME_NOISE_EN.sub(" ", s)
    s = NAME_NOISE_CJK.sub(" ", s)
    s = re.sub(r"[-_|/：:,，、]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s or "unknown"


def safe_filename(s: str) -> str:
    s = FILENAME_BAD_CHARS.sub("_", s).strip()
    return s or "unknown"


def event_start_date(event: dict) -> str:
    start = event.get("start", {})
    raw = start.get("dateTime") or start.get("date") or ""
    return raw[:10].replace("-", "") if raw else "nodate"


def load_creds() -> Credentials:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    creds: Optional[Credentials] = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_FILE.write_text(creds.to_json())
        return creds
    if not CRED_FILE.exists():
        sys.exit(
            f"OAuth client file not found: {CRED_FILE}\n"
            "Follow skills/fetch-interview-resumes/references/oauth-setup.md "
            "to create it."
        )
    flow = InstalledAppFlow.from_client_secrets_file(str(CRED_FILE), SCOPES)
    creds = flow.run_local_server(port=0)
    TOKEN_FILE.write_text(creds.to_json())
    return creds


def load_manifest() -> dict[str, str]:
    if MANIFEST_FILE.exists():
        try:
            return json.loads(MANIFEST_FILE.read_text())
        except json.JSONDecodeError:
            log.warning("Manifest corrupt; ignoring existing entries")
    return {}


def save_manifest(m: dict[str, str]) -> None:
    MANIFEST_FILE.write_text(json.dumps(m, indent=2, ensure_ascii=False))


def list_events(cal_service, calendar_id: str, days_back: int, days_ahead: int) -> list[dict]:
    now = datetime.now(timezone.utc)
    time_min = (now - timedelta(days=days_back)).isoformat()
    time_max = (now + timedelta(days=days_ahead)).isoformat()
    events: list[dict] = []
    page_token = None
    while True:
        resp = (
            cal_service.events()
            .list(
                calendarId=calendar_id,
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy="startTime",
                pageToken=page_token,
                maxResults=250,
            )
            .execute()
        )
        events.extend(resp.get("items", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return events


def download_pdf(
    drive_service,
    file_id: str,
    dest: Path,
    dry_run: bool,
) -> Optional[tuple[str, int]]:
    """Return (original_name, bytes_size) if PDF was (or would be) downloaded; None if skipped."""
    try:
        meta = (
            drive_service.files()
            .get(fileId=file_id, fields="name,mimeType,size", supportsAllDrives=True)
            .execute()
        )
    except HttpError as e:
        log.warning("Drive metadata fetch failed for %s: %s", file_id, e)
        return None
    mime = meta.get("mimeType", "")
    orig_name = meta.get("name", file_id)
    if mime != "application/pdf":
        log.info("Skip %s (%s): mimeType=%s is not application/pdf", file_id, orig_name, mime)
        return None
    if dry_run:
        return orig_name, int(meta.get("size", 0) or 0)
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = drive_service.files().get_media(fileId=file_id, supportsAllDrives=True)
    buf = io.BytesIO()
    dl = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    dest.write_bytes(buf.getvalue())
    return orig_name, dest.stat().st_size


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--days-back", type=int, default=3, help="Default: 3")
    ap.add_argument("--days-ahead", type=int, default=14, help="Default: 14")
    ap.add_argument(
        "--dest-root",
        default="interviews/resumes",
        help="Files go to <dest-root>/{be,sre,devops,unclassified}/. Default: interviews/resumes",
    )
    ap.add_argument("--calendar-id", default="primary", help="Default: primary")
    ap.add_argument("--dry-run", action="store_true", help="List matches, download nothing")
    ap.add_argument("--force", action="store_true", help="Re-download even if in manifest")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    creds = load_creds()
    cal = build("calendar", "v3", credentials=creds, cache_discovery=False)
    drive = build("drive", "v3", credentials=creds, cache_discovery=False)

    events = list_events(cal, args.calendar_id, args.days_back, args.days_ahead)
    log.info("Scanned %d events in window [-%dd, +%dd]", len(events), args.days_back, args.days_ahead)

    manifest = load_manifest()
    dest_root = Path(args.dest_root)
    downloaded = skipped_dup = skipped_nonpdf = 0

    for ev in events:
        summary = ev.get("summary", "") or ""
        desc = ev.get("description", "") or ""
        ids = extract_drive_ids(desc)
        if not ids:
            continue
        role = classify(summary)
        date = event_start_date(ev)
        name = guess_candidate_name(summary)
        if role == UNCLASSIFIED:
            log.warning("No role keyword (BE/Backend/Java/SRE/DevOps) in %r → %s/", summary, UNCLASSIFIED)

        for fid in ids:
            if not args.force and fid in manifest:
                skipped_dup += 1
                log.debug("Skip %s (already in manifest → %s)", fid, manifest[fid])
                continue
            base = f"{date}_{safe_filename(name)}"
            path = dest_root / role / f"{base}.pdf"
            if path.exists() and manifest.get(fid) != str(path):
                path = dest_root / role / f"{base}_{fid[:8]}.pdf"
            result = download_pdf(drive, fid, path, args.dry_run)
            if not result:
                skipped_nonpdf += 1
                continue
            orig_name, size = result
            log.info(
                "%s [%s] %s → %s (%d bytes)",
                "DRY " if args.dry_run else "GET ",
                role,
                orig_name,
                path,
                size,
            )
            if not args.dry_run:
                manifest[fid] = str(path)
            downloaded += 1

    if not args.dry_run:
        save_manifest(manifest)

    log.info(
        "Done: %d downloaded, %d skipped (already in manifest), %d skipped (non-PDF)",
        downloaded,
        skipped_dup,
        skipped_nonpdf,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

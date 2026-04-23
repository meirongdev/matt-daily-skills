# First-time auth setup (via `gws`)

One-time. Uses the [Google Workspace CLI](https://github.com/googleworkspace/cli) to automate the GCP project + OAuth client creation so you don't click through the Cloud console.

## 1. Install `gws`

```bash
brew install googleworkspace-cli
```

## 2. One-time Workspace setup

```bash
gws auth setup
```

This creates a GCP project, enables the Calendar + Drive APIs, creates a Desktop OAuth client, and adds you as a test user. Follow the browser prompts.

## 3. Grant the read-only scopes this script needs

```bash
gws auth login --scopes \
  https://www.googleapis.com/auth/calendar.readonly,\
  https://www.googleapis.com/auth/drive.readonly
```

A browser tab opens. Sign in, grant read-only access to Calendar and Drive, close the tab.

> **Why `--scopes` with explicit URIs, not `gws auth login -s calendar,drive`?**
> The shorthand `-s calendar,drive` grants the **full** (read-write) `calendar` and `drive` scopes. `fetch_resumes.py` asks Google for the `.readonly` variants on refresh, so a refresh against full-scope grants fails with `invalid_scope: Bad Request`. Requesting the readonly URIs directly avoids the mismatch.

## 4. Export the token for the Python script

```bash
mkdir -p ~/.config/matt-daily-skills
gws auth export --unmasked > ~/.config/matt-daily-skills/token.json
chmod 600 ~/.config/matt-daily-skills/token.json
```

> **Heads-up — two known `gws` (≥ 0.22) quirks the script silently heals**:
> 1. `gws auth export --unmasked` prints `Using keyring backend: keyring` to **stdout** before the JSON, so the resulting `token.json` starts with a plain-text line and isn't strictly valid JSON.
> 2. The exported JSON omits `token_uri` and `scopes` — both of which `google-auth` needs to refresh the token.
>
> On first load `fetch_resumes.py` extracts the JSON block via regex, injects `token_uri = https://oauth2.googleapis.com/token` and the readonly scopes as defaults, and rewrites `token.json` in canonical form. You can leave the file as-is after `gws auth export`.

Override the target directory via `MATT_SKILLS_CONFIG_DIR` if you want a different location.

## 5. Install Python dependencies

```bash
pip install -r skills/fetch-interview-resumes/requirements.txt
```

A virtualenv is fine:

```bash
python3 -m venv ~/.venvs/matt-skills
source ~/.venvs/matt-skills/bin/activate
pip install -r skills/fetch-interview-resumes/requirements.txt
```

## 6. First run

```bash
python skills/fetch-interview-resumes/scripts/fetch_resumes.py --dry-run --days-ahead 7
```

You should see log lines for any upcoming interview events that have Drive links in their description. Drop `--dry-run` to actually download.

## Troubleshooting

**`Token file not found: ~/.config/matt-daily-skills/token.json`** — step 4 wasn't run. Run it.

**`RefreshError: invalid_grant` / token revoked** — refresh token is gone. Re-run steps 3–4.

**`RefreshError: invalid_scope: Bad Request`** — the refresh token was granted scopes that don't match what the script asks for on refresh (most commonly, you granted full `calendar` + `drive` instead of the `.readonly` variants). Re-run step 3 with the explicit `--scopes` URIs above, then step 4.

**Revoke access** — <https://myaccount.google.com/permissions>, remove the app created by `gws auth setup`, then `rm ~/.config/matt-daily-skills/token.json`.

**Workspace admin blocks third-party OAuth clients** — ask the admin to allowlist the OAuth client `gws auth setup` registered (visible in your GCP project's Credentials page), or pick **Internal** user-type when `gws auth setup` prompts (only works if you own the Workspace domain).

**`gws: command not found` after `brew install`** — `brew doctor`, make sure `$(brew --prefix)/bin` is on your PATH.

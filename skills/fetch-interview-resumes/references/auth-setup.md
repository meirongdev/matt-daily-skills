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

## 3. Grant the two scopes we need

```bash
gws auth login -s calendar,drive
```

A browser tab opens. Sign in, grant read-only access to Calendar and Drive, close the tab.

## 4. Export the token for the Python script

```bash
mkdir -p ~/.config/matt-daily-skills
gws auth export --unmasked > ~/.config/matt-daily-skills/token.json
chmod 600 ~/.config/matt-daily-skills/token.json
```

The exported JSON contains `access_token`, `refresh_token`, `client_id`, `client_secret`, `token_uri`, and `scopes` — everything the Python script needs to refresh itself indefinitely.

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

**Revoke access** — <https://myaccount.google.com/permissions>, remove the app created by `gws auth setup`, then `rm ~/.config/matt-daily-skills/token.json`.

**Workspace admin blocks third-party OAuth clients** — ask the admin to allowlist the OAuth client `gws auth setup` registered (visible in your GCP project's Credentials page), or pick **Internal** user-type when `gws auth setup` prompts (only works if you own the Workspace domain).

**`gws: command not found` after `brew install`** — `brew doctor`, make sure `$(brew --prefix)/bin` is on your PATH.

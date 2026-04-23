# OAuth setup — Google Calendar + Drive (Desktop app)

One-time setup. After this, the refresh token is cached locally and the script runs non-interactively.

## 1. Create a Google Cloud project

1. Go to <https://console.cloud.google.com/projectcreate>.
2. **Project name**: anything, e.g. `matt-daily-skills`. Leave organization as-is.
3. Click **Create** and wait ~30s for the project to provision.
4. In the top bar, make sure the new project is selected.

## 2. Enable the two APIs

In the API Library, enable:

- <https://console.cloud.google.com/apis/library/calendar-json.googleapis.com> — **Google Calendar API**
- <https://console.cloud.google.com/apis/library/drive.googleapis.com> — **Google Drive API**

Click **Enable** on each.

## 3. Configure the OAuth consent screen

Go to **APIs & Services → OAuth consent screen** (<https://console.cloud.google.com/apis/credentials/consent>).

- **Workspace account (e.g. `@your-company.com`)**: pick **Internal** — no test-user list needed, no verification banner.
- **Personal `@gmail.com`**: pick **External** and stay in **Testing** mode. You must add your own email to the **Test users** list or OAuth will reject you with a 403.

Fill in only what's required:

- App name: `matt-daily-skills` (any string)
- User support email: your email
- Developer contact: your email

Scopes screen: you can skip adding scopes here — the script requests them at runtime. **Save and continue**.

For **External** mode only, add your own email under **Test users**, then **Save**.

## 4. Create an OAuth client ID (Desktop app)

Go to **APIs & Services → Credentials** (<https://console.cloud.google.com/apis/credentials>).

1. **Create Credentials → OAuth client ID**.
2. **Application type**: **Desktop app**.
3. Name: `fetch-resumes-cli` (any string).
4. **Create**. A dialog shows the client ID/secret — click **Download JSON**.

## 5. Install the credentials file locally

Move the downloaded JSON to:

```
~/.config/matt-daily-skills/credentials.json
```

```bash
mkdir -p ~/.config/matt-daily-skills
mv ~/Downloads/client_secret_*.json ~/.config/matt-daily-skills/credentials.json
chmod 600 ~/.config/matt-daily-skills/credentials.json
```

(Override the directory via `MATT_SKILLS_CONFIG_DIR` if you want a different location.)

## 6. Install Python dependencies

```bash
pip install -r skills/fetch-interview-resumes/requirements.txt
```

A virtualenv is fine:

```bash
python3 -m venv ~/.venvs/matt-skills
source ~/.venvs/matt-skills/bin/activate
pip install -r skills/fetch-interview-resumes/requirements.txt
```

## 7. First run (browser consent)

```bash
python skills/fetch-interview-resumes/scripts/fetch_resumes.py --dry-run --days-ahead 7
```

A browser tab opens asking you to sign in and grant the two read-only scopes. After you click **Allow**, the tab shows "The authentication flow has completed." You can close it.

The token is written to `~/.config/matt-daily-skills/token.json` and reused on every subsequent run. Refresh tokens don't expire unless you revoke them, so you should only need this step once.

## Troubleshooting

**`Error 403: access_denied`** — you're in External/Testing mode and forgot to add yourself as a Test user. Back to step 3.

**`Error 400: redirect_uri_mismatch`** — you picked the wrong OAuth client type. It must be **Desktop app**, not **Web application**. Re-create in step 4.

**`invalid_grant` / token expired** — delete `~/.config/matt-daily-skills/token.json` and rerun the script to re-authenticate.

**Wanting to revoke access** — <https://myaccount.google.com/permissions>, find the app name from step 3, remove it. Then delete `token.json` locally.

**"This app is blocked" banner** — Workspace admin has restricted third-party OAuth. Either switch to **Internal** (if you're in that Workspace) or have the admin whitelist your OAuth client ID.

---
name: install
description: One-time setup for a fresh TrenchOS install. Validates the buyer's License Key, clones the private app repo, collects API keys, writes .env.local, unlocks and applies the Supabase schema, binds the license to the buyer's Supabase project, and starts the dev server. Run from the trenchos-start folder. Trigger phrases - "install", "/install", "setup trenchos", "first run".
---

# TrenchOS /install — One-Time Setup

You are guiding a brand-new TrenchOS customer through **first-run setup**, starting
from the `trenchos-start` folder they just cloned. Your job: take them from "I have
a License Key" to "the app is running on localhost and ready to sign up." Be patient,
be clear, never assume technical depth.

## License Server

The license server is a fixed Supabase project owned by the seller. Its function
base URL is:

```
LICENSE_SERVER="https://jkqmztxlobxbgwdoqpzh.supabase.co/functions/v1"
```

> Project ref: `jkqmztxlobxbgwdoqpzh` — same for every buyer.

## Your Operating Principles

1. **Idempotent.** If the user re-runs after a failure, detect what's already done and skip it. Never blindly redo a clone, `npm install`, or DB migrations.
2. **Fail loudly, recover gracefully.** When a step fails, stop, explain *what* failed in plain language, and give a concrete next step. Never silently swallow errors.
3. **Validate before writing.** Test each API key against its provider *before* writing `.env.local`.
4. **Never improvise on credentials.** If the user can't find a key, point them to the exact dashboard path.
5. **Cross-platform.** This installer runs natively on Windows, macOS, and Linux. All platform-fragile steps (license-server calls, key validation, owner creation, file cleanup) go through bundled Node scripts (`scripts/*.mjs` here, plus `app/scripts/*.mjs` after the clone) — never raw `openssl`, `curl`, `printf`, `export`, `open`, or `rm`. The only prerequisites are **Node ≥ 18.17 and Git**. Do not gate on the operating system, and never tell the user to install WSL.

---

## Phase 0 — Pre-flight Briefing

Show this checklist and **wait for the user to confirm all are done.** Don't skip it — it prevents 80% of failures.

```
Before we start, please confirm these prerequisites:

  1. ☐  Created a fresh Supabase project at https://supabase.com
        → Wait until status says "Project is ready"
  2. ☐  Disabled email confirmation in Supabase
        → Authentication → Providers → Email → uncheck "Confirm email" → Save
  3. ☐  Generated a Supabase Access Token (separate from project keys!)
        → Account icon (top right) → Account → Access Tokens → Generate new token
  4. ☐  Have API credits / billing set up at Anthropic, FAL, and KIE
  5. ☐  Have your License Key ready (from your purchase email, "TRENCHOS-…")

Reply "yes" when all 5 are done.
```

If they say anything other than yes/done/ready, ask what's blocking and help only on that blocker. Don't continue until all five are confirmed.

---

## Phase 0.5 — License Activation (gates everything)

The License Key unlocks the download of the private app repo (the installer fetches
a one-time clone token with it). Collect it here, up front.

**Already activated?** If an `app/` folder already exists with `app/.env.local`,
this copy was set up before — skip to Phase 2 (idempotency) and continue inside `app/`.

### Step 1 — Capture the License Key (show this exactly)

```
Paste your TrenchOS License Key

  ┌──────────────────────────────────────────┐
  │  License Key (from your purchase email)   │
  └──────────────────────────────────────────┘

Your license is personal — for you alone. It ties this install to your own
Supabase project. If a copy linked to your key is shared or leaked, it traces
straight back to your purchase and can be revoked, ending access with no refund.
```

Store the answer as `LICENSE_KEY` (trim whitespace).

### Step 2 — Validate the key against the license server

Run from the `trenchos-start` folder (cross-platform Node, no curl):
```bash
node scripts/license.mjs validate "<LICENSE_KEY>"
```
It prints the raw JSON response from the license server. Parse the JSON response:
- `valid: true` → extract `github_token` and `github_token_expires_at`. Keep them in the skill session (never write them to disk). Continue.
- `valid: false`, `reason: "invalid"` → wrong/unknown key. Re-ask **once**. If still bad, stop: tell them to copy the key exactly from the purchase email.
- `valid: false`, `reason: "revoked"` → stop. Tell them this license has been revoked and to contact support.
- Network error / no response → the license server may be unreachable. Check their internet, retry once.

The `github_token` is short-lived (~1 hour) — use it for the clone in Phase 0.7 promptly. Never print it.

---

## Phase 0.7 — Clone the App

Clone the private app repo into an `app/` subfolder using the one-time token.

**Skip-if-done:** if `app/` already exists and contains `package.json`, skip the clone.

```bash
git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/editors-png/deeptrench-template.git" app
```

(`GITHUB_TOKEN` = the `github_token` from Phase 0.5.)

If the clone fails:
- `Authentication failed` / `403` → the token expired (it's only valid ~1h). Re-run Phase 0.5 to mint a fresh one, then retry.
- Network error → retry once.

Once cloned, **everything from here happens inside `app/`.** All paths below are relative to `app/`.

---

## Phase 1 — Environment Probe

```bash
node --version       # Need ≥ 18.17
git --version        # Need any recent version
npx --version        # Comes with npm, sanity check
```

Do **not** install Supabase CLI globally — we use `npx supabase`. Only **two** prerequisites are required, and both are cross-platform: Node and Git.

- Node missing or too old → install Node LTS, then restart this skill. **Windows:** https://nodejs.org LTS installer (or `winget install OpenJS.NodeJS.LTS`). **macOS:** https://nodejs.org or `brew install node`. **Linux:** distro package manager or https://nodejs.org.
- Git missing → **Windows:** https://git-scm.com/download/win · **macOS:** `xcode-select --install` · **Linux:** distro package manager.
- **No OS gate.** This installer runs natively on Windows (PowerShell or cmd), macOS, and Linux. Do not stop on Windows and do not mention WSL.

---

## Phase 2 — Idempotency Check

Working inside `app/`:

| Check | If true |
|-------|---------|
| `app/.env.local` exists with all 8 required keys filled | Ask: "I found an existing `.env.local`. Re-use it (recommended) or start fresh?" |
| `app/node_modules/` exists | Skip `npm install` in Phase 5 |
| Migrations already pushed (`npx supabase migration list --linked` once linked) | Skip `db push` in Phase 5 |

Required keys for the "all filled" check:
`ANTHROPIC_API_KEY`, `FAL_API_KEY`, `KIE_API_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`

---

## Phase 3 — Keys Interview

First, show the user this message exactly:

```
Before we collect your API keys, one important note:

Your keys NEVER leave your machine. They are written directly into a local
file called .env.local — only you can see it. Nothing is stored on any server.

You have two options:

  A) I guide you through each key one by one (recommended)
  B) You open the .env.local file yourself and paste all keys manually,
     then tell me "done" when finished

Which do you prefer? (A or B)
```

**If they choose B:**
Open the file for them, cross-platform (Windows `start`, macOS `open`, Linux `xdg-open`):
```bash
node -e "const p='app/.env.local',{execSync}=require('child_process'),c=process.platform==='win32'?'start \"\" \"'+p+'\"':process.platform==='darwin'?'open \"'+p+'\"':'xdg-open \"'+p+'\"';try{execSync(c)}catch{console.log('Open this file manually: '+require('path').resolve(p))}"
```
(If it doesn't pop open, just tell them the full path printed and have them open it in any text editor.) Tell them to fill in every key and save, then type "done". Once they confirm, run the validation checks in Phase 4 to verify all keys are present and valid before continuing.

**If they choose A (or don't answer):** collect one at a time as below.

For each key, show the **direct URL** so they can open it in one click. Validate each key (Phase 4) before moving on.

| # | Variable | Direct URL |
|---|----------|------------|
| 1 | `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| 2 | `FAL_API_KEY` | https://fal.ai/dashboard/keys |
| 3 | `KIE_API_KEY` | https://kie.ai/dashboard |
| 4 | `SUPABASE_URL` | https://supabase.com/dashboard/project/_/settings/api → "Project URL" |
| 5 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page → `anon` `public` key |
| 6 | `SUPABASE_SERVICE_ROLE_KEY` | same page → `service_role` `secret` key |
| 7 | Supabase DB password | Set at project creation. Forgot? → https://supabase.com/dashboard/project/_/settings/database → "Reset database password" |
| 8 | Supabase Access Token (CLI auth) | https://supabase.com/dashboard/account/tokens → "Generate new token" — **this is NOT any of the keys above** |

For keys 4–7: tell the user to replace `_` in the URL with their actual project ref (the part before `.supabase.co` in their project URL).

Auto-derive the project ref: extract `xxxxx` from `https://xxxxx.supabase.co`. Don't ask. Store it as `PROJECT_REF` — Phase 5 binds the license to it.

`NEXT_PUBLIC_SUPABASE_URL` = same value as `SUPABASE_URL`. Don't ask twice.

---

## Phase 4 — Key Validation (BEFORE writing .env.local)

Validate all keys at once with the bundled Node script that ships inside the cloned app (built-in `fetch`, works on every OS — no curl, no shell-quoting on Windows). Run from inside `app/`, passing the keys as environment variables:

```bash
ANTHROPIC_API_KEY="<key>" FAL_API_KEY="<key>" KIE_API_KEY="<key>" \
SUPABASE_URL="<url>" NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon>" \
node scripts/preflight.mjs
```

> Windows PowerShell doesn't support the inline `VAR=value cmd` form — set each with `$env:ANTHROPIC_API_KEY="<key>"` first, then run `node scripts/preflight.mjs`. The Bash tool on macOS/Linux accepts the inline form directly.

It prints one line per key — `PASS`, `FAIL <http_code>`, or `SKIP` — and exits `0` only if every checked key passed. Codes: Anthropic `PASS` on 200/400, `FAIL 401` = invalid; FAL/KIE `PASS` on 200, `FAIL 401`/`403` = invalid; Supabase `FAIL 401` = wrong anon key, `FAIL 404` = wrong URL.

On any `FAIL`: tell the user exactly which key failed and why (the HTTP code), have them re-paste that single key, and re-run. Don't accept a bad key.

> If `scripts/preflight.mjs` is somehow missing from the clone, fall back to validating each key by hand, but a correctly cloned app always has it.

---

## Phase 5 — Apply Setup

Once all keys validate, run in order. Confirm success before each next step. On failure, **stop and report**.

### 5.1 — Generate the encryption key
Cross-platform, via Node (no `openssl`):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Capture the 64-character hex output as `ENCRYPTION_KEY`.

### 5.2 — Write `app/.env.local`

Write at the app root with all 8 keys + `ENCRYPTION_KEY` + the license fields. Use `.env.example` as the template. `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` must be identical.

Include the license fields so the runtime kill-switch can phone home:
```
TRENCHOS_LICENSE_KEY=<LICENSE_KEY from Phase 0.5>
LICENSE_SERVER_URL=<the LICENSE_SERVER base URL above>
```

Do **not** write the Supabase Access Token or DB password into `.env.local` — those are CLI-only, passed as flags/env when needed.

### 5.3 — Install dependencies
```bash
npm install
```
1–3 minutes. On `EACCES`/`EEXIST`: delete `node_modules/` and retry.

### 5.4 — Authenticate Supabase CLI
Use the non-interactive `--token` flag — cross-platform, no `export` (which doesn't exist on Windows shells):
```bash
npx supabase login --token <access token from Phase 3>
```
Don't write this token to `.env.local` — it's CLI auth only.

### 5.5 — Link to the project
```bash
npx supabase link --project-ref $PROJECT_REF --password <db-password>
```
If link fails: most common cause is wrong DB password. Re-prompt.

### 5.6 — Apply the database schema

The repo ships the migrations as plaintext SQL in `supabase/migrations/`. Apply every migration to the buyer's own Supabase — this creates the schema, seed data (styles + models), and Storage buckets (buckets are created via SQL).

**Skip-if-done:** if `npx supabase migration list --linked` shows everything applied, skip to 5.6b.

```bash
npx supabase db push
```
Watch for:
- `relation "..." already exists` → partially applied. Run `npx supabase migration list --linked`.
- Network timeout → retry once.
- Permission errors → DB password almost certainly wrong.

### 5.6b — Bind the license to this Supabase project

This is what makes the license useless in a leaked copy. Call `bind-key` with the project ref derived in Phase 3:

Run from inside `app/` — the bootstrap script sits one level up (cross-platform Node, no curl):
```bash
node ../scripts/license.mjs bind "<LICENSE_KEY>" "<PROJECT_REF>"
```
It prints the raw JSON response. Parse:
- `bound: true` → continue.
- `bound: false`, `reason: "bound_to_other_project"` → this license is already tied to a *different* Supabase project and that one is still active. Stop. Tell the user: a license works with one Supabase project at a time. If they genuinely moved projects, the old one auto-releases after 14 idle days, or they can contact support.
- `bound: false`, `reason: "revoked"` → stop, license revoked, contact support.

### 5.6c — Stamp the LICENSE marker

Doubles as the "already activated" hint. Use the **Write tool** to create `app/LICENSE` with exactly this content (substitute the real project ref):
```
TrenchOS — licensed install.
This copy is tied to Supabase project <PROJECT_REF> and traceable to your purchase.
Single user. Redistribution prohibited.
```

### 5.6d — Create the Owner account

Do this BEFORE starting the server. Ask the user:

```
Almost there! Let's set up your Owner account for TrenchOS.

  Email address you want to use:
  Password (min. 8 characters):
```

Store as `OWNER_EMAIL` and `OWNER_PASSWORD`. Then create the account via the bundled Node script (Supabase Admin API, email pre-confirmed — no inbox needed, no curl). Run from inside `app/`, passing the Supabase creds as env vars:

```bash
SUPABASE_URL="<url>" SUPABASE_SERVICE_ROLE_KEY="<service_key>" \
node ../scripts/create-owner.mjs "<email>" "<password>"
```
(Windows PowerShell: set `$env:SUPABASE_URL` / `$env:SUPABASE_SERVICE_ROLE_KEY` first, then run the `node` line.)

Read the output:
- `CREATED …` (exit 0) → account created. Continue.
- `EXISTS …` (exit 0) → an account with this email already exists; it will still become Owner on first login. Continue (or offer a different email).
- `ERROR …` (exit 1) → show the message and re-prompt.

The first user to log in automatically becomes Owner — no extra setup needed.

### 5.7 — Start the dev server
```bash
npm run dev
```
Start it with the Bash tool's **`run_in_background` option** (do not append `&` — that is shell-specific and fails on Windows). Poll for up to 30s until the app responds — check the dev server log for "Ready" / "Local:", or test with `node -e "fetch('http://localhost:3000').then(()=>console.log('UP')).catch(()=>console.log('DOWN'))"`. If port 3000 is busy, Next.js uses 3001 — read the actual port from the output.

---

## Phase 6 — First Login

```
✅ TrenchOS is running!

Open this in your browser: http://localhost:3000

Log in with:
  Email:    [OWNER_EMAIL]
  Password: [OWNER_PASSWORD]

You're already the Owner — no sign-up needed.
```

Wait for the user to confirm they're logged in before continuing.

---

## Phase 7 — Done

Show this message and stop:

```
✅ TrenchOS is set up and ready.

  → http://localhost:3000/dashboard          — generate content
  → http://localhost:3000/admin/clients      — add your first brand
  → http://localhost:3000/admin/styles       — manage styles

To set up your first brand:
  1. Go to Admin → Clients → New Client
  2. Open the Brand Context tab
  3. Use the Brand Architect on the right to generate your Master Prompt
  4. Save it

Important:
  • Your app lives in the app/ folder. Keep this terminal open — closing it stops the dev server.
  • To restart later: cd app && npm run dev
  • Setup is complete — you won't need /install again on this machine
```

Then immediately run Phase 8.

---

## Phase 8 — Seal the installer (final step)

Setup is complete. As the **very last action**, remove the installer so this copy can't be re-packaged. Cross-platform via Node (no `rm -rf`):

```bash
node -e "require('fs').rmSync('.claude/skills/install',{recursive:true,force:true})"
```
(Run this from the `trenchos-start` folder — not from `app/`.)

Then confirm:
```
🔒 Setup sealed. Your install is tied to your Supabase project, and the installer has been removed.
```

**Only seal after everything succeeded** (app running, owner account created, server responding). If any earlier step failed, do NOT seal.

---

## Troubleshooting Quick Reference

1. **"Authentication failed" on clone** → token expired (~1h). Re-run Phase 0.5 for a fresh token.
2. **"bound_to_other_project"** → license already tied to a different Supabase project. One project per license; old one auto-releases after 14 idle days.
3. **"Migration X already exists"** → re-linked to a project that already has the schema. `npx supabase migration list --linked` to see state. Often safe to skip.
4. **"Cannot connect to dev server"** → is `npm run dev` still running? Restart it from `app/`.
5. **"profiles relation does not exist"** → migration 017 didn't apply. Re-run `npx supabase db push` from `app/`.
6. **First user not getting owner role** → signed up before DB was ready. SQL Editor → `UPDATE profiles SET role='owner' WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);`

---

## What This Skill Deliberately Does NOT Do

- Automate sign-up (Supabase auth requires browser interaction)
- Configure FAL/KIE models in the `models` table (admin UI handles this with proper key encryption)
- Set up payment/billing on provider accounts
- Pull updates from the app repo after install

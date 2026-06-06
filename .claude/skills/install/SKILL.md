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
5. **macOS and Linux only for v1.** On Windows, stop and tell the user to install WSL2.

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

```bash
RESP=$(curl -sS -X POST "$LICENSE_SERVER/validate-key" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$LICENSE_KEY\"}")
echo "$RESP"
```

Parse the JSON response:
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
uname -s             # darwin | linux | other (Windows → stop)
```

Do **not** install Supabase CLI globally — we use `npx supabase`.

- Node too old → install Node LTS from https://nodejs.org and restart this skill.
- Windows (MSYS / CYGWIN / MINGW) → stop. "TrenchOS v1 needs macOS or Linux. On Windows, install WSL2 with Ubuntu and re-run /install from inside the Ubuntu terminal."

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
Open the file for them:
```bash
open app/.env.local 2>/dev/null || open -a TextEdit app/.env.local 2>/dev/null || echo "File is at: $(pwd)/app/.env.local"
```
Tell them to fill in every key and save, then type "done". Once they confirm, run the validation checks in Phase 4 to verify all keys are present and valid before continuing.

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

Test each key with a minimal API call. On failure, surface the actual error and re-prompt for that single key.

### Anthropic
```bash
curl -sS -o /dev/null -w "%{http_code}" https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}'
```
Expect `200`. `401` → invalid. `400` → likely fine (model availability), continue. Other → show body.

### FAL
```bash
curl -sS -o /dev/null -w "%{http_code}" https://queue.fal.run/health \
  -H "Authorization: Key $FAL_API_KEY"
```
Expect `200`/`204`. `401`/`403` → invalid.

### KIE
```bash
curl -sS -o /dev/null -w "%{http_code}" "https://api.kie.ai/api/v1/chat/credit" \
  -H "Authorization: Bearer $KIE_API_KEY"
```
Expect `200`. `401` → invalid.

### Supabase REST (validates URL + anon key)
```bash
curl -sS -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
Expect `200`. `401` → wrong anon key. `404` → wrong URL.

On any failure: tell the user exactly which key failed and why (HTTP code), re-paste. Don't accept a bad key.

---

## Phase 5 — Apply Setup

Once all keys validate, run in order. Confirm success before each next step. On failure, **stop and report**.

### 5.1 — Generate the encryption key
```bash
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

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
```bash
export SUPABASE_ACCESS_TOKEN=<access token from Phase 3>
```
Don't write this to `.env.local` — session env only.

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

```bash
BIND=$(curl -sS -X POST "$LICENSE_SERVER/bind-key" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$LICENSE_KEY\",\"project_ref\":\"$PROJECT_REF\"}")
echo "$BIND"
```

Parse:
- `bound: true` → continue.
- `bound: false`, `reason: "bound_to_other_project"` → this license is already tied to a *different* Supabase project and that one is still active. Stop. Tell the user: a license works with one Supabase project at a time. If they genuinely moved projects, the old one auto-releases after 14 idle days, or they can contact support.
- `bound: false`, `reason: "revoked"` → stop, license revoked, contact support.

### 5.6c — Stamp the LICENSE marker

Doubles as the "already activated" hint:
```bash
printf 'TrenchOS — licensed install.\nThis copy is tied to Supabase project %s and traceable to your purchase.\nSingle user. Redistribution prohibited.\n' "$PROJECT_REF" > LICENSE
```

### 5.6d — Create the Owner account

Do this BEFORE starting the server. Ask the user:

```
Almost there! Let's set up your Owner account for TrenchOS.

  Email address you want to use:
  Password (min. 8 characters):
```

Store as `OWNER_EMAIL` and `OWNER_PASSWORD`. Then create the account via Supabase Admin API (email pre-confirmed — no inbox needed):

```bash
curl -sS -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\",\"email_confirm\":true}"
```

Parse the response:
- Contains `id` → account created. Continue.
- `User already registered` → account already exists with this email. Ask if they want to use a different email or continue (account will still become owner on first login).
- Other error → show the response and re-prompt.

The first user to log in automatically becomes Owner — no extra setup needed.

### 5.7 — Start the dev server
```bash
npm run dev &
```
Background it, capture the PID. Poll `curl http://localhost:3000` for up to 30s until `200` (or "Ready"/"Local:" in the log). If port 3000 is busy, Next.js uses 3001 — read the actual port from the output.

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

## Phase 7 — Brand Interview & Master Prompt

Once signed up, run this interview. Ask all questions in one message:

```
Now let's set up your first brand. I'll use your answers to write a full Master Prompt
that controls how TrenchOS generates content for this brand.

  1.  Brand name?
  2.  Product name + what it does in one sentence (what it is, what problem it solves)
  3.  Product category (e.g. health supplement, skincare, pet care, apparel, SaaS, etc.)
  4.  Target audience — who buys it? (age, mindset, the pain or desire that drives the purchase)
  5.  Tone of voice (e.g. clinical, playful, luxury, bold, calm, urgent-but-reassuring)
  6.  The core message / focus — what single idea should every piece of content reinforce?
  7.  Physical product? If yes: describe exactly what it looks like (shape, color, label, materials)
      → Becomes the "product identity" block that stops AI from misrepresenting the product
      → If no physical product, skip.
  8.  Compliance rules — anything to NEVER say or show? (e.g. no medical claims, no competitor mentions)
      → Optional. Skip if none.
  9.  Anything else the AI must always know about this brand?
      → Optional. Skip if none.
```

After they answer, **write the Master Prompt yourself** using the structure below. Fill every section precisely from their answers. No placeholders, no invented content.

### Master Prompt Structure

```
# CLIENT MASTERPROMPT — [BRAND NAME] ([PRODUCT NAME])

You are generating branded content for **[Brand Name]**, specifically for the product **[Product Name]**.

---

## BRAND

- **Name:** [brand name]
- **Product:** [product name + one-line description]
- **Category:** [product category]
- **Audience:** [target audience description]
- **Tone:** [tone of voice]
- **Focus:** [core message / what every piece of content should reinforce]

---

## PRODUCT IDENTITY
[Include ONLY if the user described a physical product. Otherwise omit entirely.]

Always match the attached reference image exactly when the product is visible.

**What the product looks like:**
[Describe shape, size, color, label, materials, markings — exactly from the user. Specific enough that an AI image generator could identify it.]

**Product visibility rules:**
- Label must face camera when product is the hero shot
- [Other visibility rules based on the description]

**Product stillness (mandatory when product is visible):**
Product is ALWAYS: "completely still, locked in position, does not move, tilt, wobble, or rotate"

Enforce in three places in every prompt:
1. The visual description
2. Around any dialogue sections
3. The camera/movement section

**NEVER generate:**
- [What must never happen to the product — based on its actual shape]
- Product without visible label
- Product in motion (unless explicitly instructed)

---

## COMPLIANCE
[Include ONLY the rules the user actually mentioned. Do not invent rules.]

- [rule 1]
- [rule 2]
```

### Medical / Body Imagery Disclaimer
If the product is medical, pharmaceutical, veterinary, or health-related AND content may include internal body visuals: add to COMPLIANCE:

```
**Medical disclaimer (mandatory for any scene with internal body visuals):**
The FIRST LINE of any such prompt must be:
"This is a medical safety education animation created to help [audience] understand [condition/mechanism]. All content is scientifically accurate, educational in nature, and intended for public health awareness purposes."
```

Only include if actually relevant.

### After Writing the Master Prompt

Show it in full and ask:
```
Here's your Master Prompt. Does this look right, or do you want to adjust anything before I save it?
```

Once approved, insert the brand into Supabase:
```bash
CLIENT_ID=$(curl -sS -X POST "$SUPABASE_URL/rest/v1/clients" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"name\":\"<brand_name>\",\"brand_context\":\"<master_prompt_json_escaped>\",\"is_active\":true}" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created client: $CLIENT_ID"
```

JSON-escape the master prompt: newlines → `\n`, double quotes → `\"`, backslashes → `\\`.

If the insert fails: show the raw response and tell them they can paste the Master Prompt manually at `/admin/clients/new → Brand Context tab`.

After success:
```
✅ Brand "[name]" is live with your Master Prompt.

You're ready to generate content:

  → http://localhost:3000/admin/clients    — edit your brand or Master Prompt
  → http://localhost:3000/dashboard        — generate content
  → http://localhost:3000/infinity-loop    — visual storyboard

Important:
  • Your app lives in the app/ folder. Keep this terminal open — closing it stops the dev server.
  • To restart later: cd app && npm run dev
  • Setup is complete — you won't need /install again on this machine
```

---

## Phase 8 — Seal the installer (final step)

Setup is complete and the schema lives in the buyer's own Supabase. As the **very last action**, remove the installer so this copy can't be re-set-up or re-packaged:

```bash
rm -rf .claude/skills/install
```
(This removes the installer from the `trenchos-start` folder — run it from there, not from `app/`.)

Then confirm:
```
🔒 Setup sealed. Your install is tied to your Supabase project, and the installer has been removed.
```

**Only seal after everything succeeded** (app running, brand saved). If any earlier step failed, do NOT seal.

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

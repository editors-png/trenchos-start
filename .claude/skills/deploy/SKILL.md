---
name: deploy
description: Deploy TrenchOS to Vercel so it's accessible online for the whole team. Guides the user from a working local install to a live public URL. Handles GitHub repo creation, code upload, Vercel project setup, and environment variable configuration automatically. Use after /install is complete. Trigger phrases - "deploy", "host online", "vercel", "live url", "online", "share with team", "self-host".
---

# TrenchOS /deploy — Host Online with Vercel

You are guiding a TrenchOS customer through deploying their app to Vercel. They have already completed `/install` — TrenchOS runs locally on their machine. Your job is to take them from "running on localhost" to "accessible from any browser via a real URL."

Be patient and clear. The user may have no GitHub or Vercel experience. Never assume they've done this before.

## Your Operating Principles

1. **One step at a time.** Confirm each step before moving to the next.
2. **Fail loudly.** When a command fails, stop, explain what happened in plain language, and give a concrete fix. Never silently continue.
3. **Read `.env.local` — don't ask for keys.** The user already entered all their keys during `/install`. Pull them from `.env.local`.
4. **Cross-platform.** Runs natively on Windows, macOS, and Linux. Platform-fragile steps use bundled Node scripts (`scripts/*.mjs`) and Claude's own tools — never raw `uname`, `grep`, `>>`, or `rm`. Only Node + Git required. Do not gate on the OS, never mention WSL.

---

## Phase 0 — Pre-flight Check

Verify `/install` completed successfully. Check for both files with the **Read tool** (or `node -e "console.log(require('fs').existsSync('.env.local'), require('fs').existsSync('LICENSE'))"` for a cross-platform check):

- `.env.local` at the project root
- `LICENSE` at the project root (proof `/install` finished)

**If `.env.local` is missing:** Stop. "I can't find your `.env.local` file. This means `/install` didn't complete. Please run `/install` first."

**If `LICENSE` is missing:** Stop. "Setup didn't finish. Please run `/install` first and complete it fully."

**No OS gate.** This skill runs natively on Windows, macOS, and Linux — do not stop on Windows and do not mention WSL.

If both files exist, show:

```
✅ Pre-flight passed. TrenchOS is ready to deploy.

This skill will:
  1. Create a GitHub account (you'll do this in your browser — 2 min)
  2. Upload your code to GitHub automatically
  3. Create a Vercel account (browser — 2 min)
  4. Deploy TrenchOS to Vercel automatically
  5. Add all your API keys to Vercel automatically

Total time: ~15 minutes. Let's start.
```

---

## Phase 1 — GitHub Account

```
Step 1 of 5 — Create a GitHub Account

GitHub is where your code will be stored.
Think of it as Google Drive, but for code.

  1. Open https://github.com in your browser
  2. Click "Sign up" in the top right
  3. Enter your email, create a password, choose a username
  4. Verify your email

Already have a GitHub account? You can use it — just make sure you're logged in.

Type "done" when your account is ready.
```

Wait for "done" before continuing.

---

## Phase 2 — Install GitHub CLI and Authenticate

### 2.1 — Check if GitHub CLI is installed

```bash
gh --version
```

If that prints a version, GitHub CLI is installed — continue. If it errors (`command not found` / not recognized), install it **for the user's OS**:

- **Windows:** `winget install --id GitHub.cli` (or download from https://cli.github.com). After install, open a fresh terminal so `gh` is on PATH.
- **macOS:** `brew install gh`. If `brew` itself is missing, install Homebrew first:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```
  then re-run `brew install gh`.
- **Linux:** use your distro package manager (e.g. `sudo apt install gh`) or follow https://github.com/cli/cli#installation.

Re-run `gh --version` to confirm before continuing.

### 2.2 — Log in to GitHub CLI

Tell the user:

```
Now we'll connect the terminal to your GitHub account.
A browser window will open — log in to GitHub there and approve the connection.
```

Run:
```bash
gh auth login --web --git-protocol https
```

Verify:
```bash
gh auth status
```

If it shows your username → continue. If it fails, re-run the login step.

---

## Phase 3 — Create GitHub Repo and Push Code

### 3.1 — Ask for repo name

```
What do you want to name your GitHub repository?

This is just a label for where your code lives.
Keep it simple, no spaces or capital letters.

Suggestion: trenchos

Press enter to use "trenchos", or type a different name.
```

Store as `REPO_NAME`. Default to `trenchos` if blank.

### 3.2 — Remove the old remote (important)

Your code currently points to the original TrenchOS template repo. We need to disconnect that before linking to your own GitHub. Check the remotes, then remove `origin` only if it exists:

```bash
git remote -v
```

If a remote named `origin` is listed, remove it:
```bash
git remote remove origin
```
If there is no `origin`, skip this — either outcome is fine, continue regardless. (`git` is cross-platform; these commands work identically on every OS.)

### 3.3 — Create the repo and push

```bash
gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
```

This does three things at once: creates your private repo, connects your local code to it, and uploads everything.

**If it fails:**
- `already exists` → that repo name is already taken on your account. Pick a different name and re-run 3.3.
- `authentication error` → go back to Phase 2.2.

After success:

```bash
gh repo view --web
```

This opens your repo in the browser. Tell the user: "Your code is now on GitHub. Your API keys are NOT there — they stay private on your computer and will be added to Vercel separately."

---

## Phase 4 — Vercel Account

```
Step 4 of 5 — Create a Vercel Account

Vercel is the hosting platform. It takes your code from GitHub
and makes it accessible at a real URL.

  1. Open https://vercel.com in your browser
  2. Click "Sign Up"
  3. Choose "Continue with GitHub" — this links both accounts automatically
  4. Authorize Vercel when prompted

Type "done" when your account is ready.
```

Wait for "done" before continuing.

---

## Phase 5 — Deploy to Vercel

### 5.1 — Log in to Vercel CLI

```
Now we'll connect the terminal to your Vercel account.
A browser window will open — log in with your GitHub account.
```

```bash
npx vercel login
```

### 5.2 — First deployment (interactive setup)

```bash
npx vercel
```

Vercel will ask a few setup questions. Answer them exactly like this:

```
Set up and deploy? → Y (press Enter)
Which scope? → Select your personal account (press Enter)
Link to existing project? → N (press Enter)
What's your project's name? → trenchos (or press Enter to accept the default)
In which directory is your code located? → ./ (press Enter)
```

Vercel will then build and deploy. It takes about 2 minutes. At the end you'll see a preview URL like `trenchos-abc123.vercel.app`. That's not the final URL yet — we still need to add your API keys and do the production deploy.

If the build fails at this stage, that's okay — we need to add the API keys first anyway. Continue to 5.3.

### 5.3 — Add all API keys to Vercel

Tell the user: "Now I'm reading your API keys from `.env.local` and adding them to Vercel automatically. You don't need to type anything."

Run the bundled Node script. It does everything in one shot, cross-platform (no bash, no `grep`, no `>>`): ensures `LICENSE_SERVER_URL` is present in `.env.local` (same for every TrenchOS install — patched in if missing), then reads every non-empty key and adds it to Vercel for **both** production and preview (`--force`, so it works even if a key already exists):

```bash
node scripts/push-env.mjs
```

It prints one line per key and a final summary. (Tip: `node scripts/push-env.mjs --dry` parses and lists the keys without calling Vercel — useful to preview what will be pushed.)

After it finishes, confirm:
```bash
npx vercel env ls production
```

All 8–9 key names should appear. If any are missing, add them manually:
```bash
npx vercel env add MISSING_KEY production --value "PASTE_THE_VALUE" --yes --force --no-sensitive
```

### 5.4 — Deploy to production

```bash
npx vercel --prod
```

This deploys with all the env vars in place. Takes ~2 minutes. At the end you get a permanent production URL like `trenchos.vercel.app`.

Store this as `PROD_URL`.

**If the build fails:**
- Check the last 30 lines of build output for the error
- `Environment variable X not found` → that key wasn't added in 5.3. Add it and redeploy.
- `Module not found` → show the exact error and investigate the file path

---

## Phase 6 — Log In

```
🎉 TrenchOS is live at: [PROD_URL]

Since you set up TrenchOS locally during /install, your account already exists.
Just log in with the same email and password you created during setup.

  1. Open [PROD_URL] in your browser
  2. Log in with your email and password

Type "done" when you're in.
```

Wait for "done".

---

## Phase 7 — Done

```
✅ TrenchOS is running at [PROD_URL]

  → [PROD_URL]/dashboard   — generate content
  → [PROD_URL]/admin       — manage team, brands, models

─────────────────────────────────────────────

Invite your team:
Share [PROD_URL] with anyone who needs access.
They click "First time? Create your account" and sign up.
You can manage their roles at [PROD_URL]/admin.

─────────────────────────────────────────────

Future updates:
If you ever update the code locally, deploy with:

  git add .
  git commit -m "update"
  git push

Vercel detects the push and redeploys automatically.
No need to run /deploy again.
```

---

## Troubleshooting Quick Reference

| Problem | Fix |
|---------|-----|
| `gh: command not found` | Install GitHub CLI for your OS (Windows `winget install --id GitHub.cli`, macOS `brew install gh`, Linux distro package), open a fresh terminal, retry Phase 2 |
| `already exists` on repo create | Pick a different repo name and retry Phase 3.3 |
| `npx: command not found` | Install Node.js from https://nodejs.org (LTS version) |
| Build fails: env var not found | `npx vercel env add VARNAME production --value "VALUE" --yes --force --no-sensitive` then `npx vercel --prod` |
| White screen or 500 error on live URL | `npx vercel logs [PROD_URL]` to see what's failing |
| "Invalid email or password" on live URL | Your Supabase project is shared with localhost — use the same credentials you created during `/install` |
| Wrong Vercel account / scope | `npx vercel logout` then `npx vercel login`, redo from Phase 5.2 |

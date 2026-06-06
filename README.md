# Start TrenchOS

Welcome 👋 This is the installer for **TrenchOS**. It sets everything up for you
— you just need your **License Key** (from your purchase email) and about 15
minutes.

## What you need first

1. **Node.js** (LTS) — https://nodejs.org (download, install, done)
2. **Claude Code** — in your terminal run:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
3. A **Supabase** account (free) — https://supabase.com
4. Your **License Key** — check your purchase email (looks like `TRENCHOS-xxxx…`)

## Install (4 steps)

```bash
git clone https://github.com/editors-png/trenchos-start.git
cd trenchos-start
claude
```

Then inside Claude Code, type:

```
/install
```

Paste your License Key when asked. The installer takes it from there — it
unlocks the app, asks for your API keys (with exact links for each), sets up
your database, and gets you to your first content generation.

---

That's it. If anything goes wrong mid-install, just run `/install` again — it
picks up where it left off.

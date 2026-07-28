---
name: update
description: Apply a TrenchOS update to this installation. Lists available updates or applies a specific named one. Detects conflicts with local changes before touching any file. Trigger phrases - "update", "/update", "install update", "apply update", "get latest".
---

# /update

Apply a TrenchOS update released by the creator. Updates are distributed as structured files in the template repo. This skill fetches the latest update list, checks your local files for conflicts, and applies the changes safely.

If you have built your own features in this codebase, the skill will warn you before touching any file you have modified — you will never lose your own work silently.

## Usage

```
/update                  — list all available updates
/update [name]           — apply a specific update (e.g. /update provider-system)
```

---

## Phase 1: Fetch available updates

Fetch the latest state from the template repo without changing your local code (`git` is cross-platform; these commands work the same on every OS):

```bash
git fetch origin
```

If `git fetch` fails (no internet, credentials issue): stop and show the error. Tell the user to check their connection and that their GitHub access token may have expired.

List all update files on the remote:
```bash
git show origin/main:updates/
```

If that errors with "does not exist" / "exists on disk, but not in 'origin/main'": tell the user no updates are available yet.

Read the local applied-updates log with the **Read tool** (`.applied-updates` at the project root). If the file doesn't exist, treat it as empty — no updates applied yet.

Determine which updates have NOT been applied yet by comparing the remote list against `.applied-updates`.

---

## Phase 2: List or select

### If no update name was given (`/update` with no args)

Show the user a table of all available updates:

```
Available TrenchOS updates:

  [NNN] [name]          [title]                    [applied/available]
  001   new-workflow    New Workflow Feature         ✅ applied
  002   provider-system New Provider System          ⬜ available
  003   video-fix       Video Polling Timeout Fix    ⬜ available

Run /update [name] to apply a specific update.
Updates can be applied individually and in any order.
```

Stop here — do not apply anything without an explicit name.

### If an update name was given

Find the matching update file on the remote — run `git show origin/main:updates/` and scan the listing yourself for `[name]` (no `grep` needed; works on every OS).

If not found: tell the user the update name doesn't exist, and list what's available.

If already applied (in `.applied-updates`): tell the user this update was already applied and ask if they want to re-apply. Default: no.

Read the update file:
```bash
git show origin/main:updates/[filename].md
```

---

## Phase 3: Conflict check

The update file lists which files it affects (the `affects:` frontmatter). Before touching anything, check each file for local modifications:

```bash
git diff HEAD -- [file path]
```

Also check for uncommitted staged changes:
```bash
git diff --staged -- [file path]
```

**If any affected file has local changes:**

Show this warning and stop:

```
⚠️  Conflict detected before applying update [name]

The following files have local changes that would be overwritten:

  [file path 1]
  [file path 2]

Options:
  1. Commit or stash your changes first, then re-run /update [name]
  2. Skip the conflicting files and apply only the rest (may leave the update incomplete)
  3. Cancel

What would you like to do? (1 / 2 / cancel)
```

Wait for the user's choice:
- `1` → Tell them to commit/stash (`git stash`), then re-run. Stop.
- `2` → Continue applying, skip the conflicting files. Note what was skipped in the final report.
- `cancel` → Stop.

Do not overwrite a locally modified file without the user choosing option 2 explicitly.

---

## Phase 4: Apply changes

Read the full update file and apply each change section:

### For each "Replace / With" block:
1. Identify the target file (path relative to repo root)
2. Read the current file content
3. Verify the "Replace" block exists in the file verbatim — if not, warn the user that the file may already be different (possibly from a prior update or their own changes), and ask whether to skip or attempt a manual merge
4. Use Edit to apply the replacement

### For new files:
Write the file with the content from the update.

### For removed files:
Ask for confirmation before deleting. Never silently delete.

---

## Phase 5: Apply migrations (if any)

If the update file has `migrations: true`:

1. Write the migration SQL to a new file. Get a cross-platform timestamp via Node:
   ```bash
   node -e "console.log(new Date().toISOString().replace(/[-:T]/g,'').slice(0,14))"
   ```
   Then use the **Write tool** to create: `supabase/migrations/[timestamp]_[slug].sql`

2. Push to the database:
   ```bash
   npx supabase db push
   ```

3. If `db push` fails: show the error. Tell the user to check that their Supabase project is linked (`npx supabase status`) and their access token is still valid.

---

## Phase 6: Log and report

1. Append the update name to `.applied-updates` using the **Edit tool** (or Write if the file doesn't exist yet) — add a line `[NNN]-[slug]`. Do not use shell `>>` (not portable to Windows).

2. Show the final report:

```
✅ Update applied: [NNN] — [title]

Changes applied:
  [list of files changed]

[If files were skipped:]
⚠️  Skipped (local conflict):
  [list of skipped files]

[If migrations ran:]
  Database migrations applied.

[If anything failed:]
  ❌ [what failed and what to do next]
```

---

## Edge cases

- **`git fetch` requires authentication** — if the customer's GitHub token expired, they need to re-authenticate. Tell them: `gh auth login` or update their git credentials.
- **Update depends on another update** — if an update file mentions a prerequisite in its summary, warn the user before applying.
- **Re-applying an already-applied update** — only do this if the user explicitly confirms. Useful if something went wrong the first time.
- **No `.applied-updates` file** — treat all updates as unapplied. Create the file on first apply.

#!/usr/bin/env node
// create-owner.mjs — cross-platform replacement for the `curl` call that creates
// the Owner account via the Supabase Admin API in the bootstrap installer
// (Phase 5.6d). Uses built-in fetch — no curl, no shell-quoting issues on Windows.
//
// Usage:
//   node scripts/create-owner.mjs <email> <password>
// Reads from env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Creates the user pre-confirmed (no inbox needed). Prints a clear status line.
// Exit 0 = created OR already exists, 1 = real error, 2 = usage.

const [email, password] = process.argv.slice(2)
const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !password) {
  console.error('Usage: node scripts/create-owner.mjs <email> <password>')
  process.exit(2)
}
if (!url || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.')
  process.exit(2)
}

const res = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password, email_confirm: true }),
})

const text = await res.text()
let data = {}
try {
  data = JSON.parse(text)
} catch {
  /* non-JSON */
}

if (data.id) {
  console.log(`CREATED — Owner account ${email} created.`)
  process.exit(0)
}
const msg = (data.msg || data.error_description || data.error || text || '').toString()
if (/already.*registered|already.*exists|email_exists/i.test(msg)) {
  console.log(`EXISTS — an account with ${email} already exists (it will become Owner on first login).`)
  process.exit(0)
}
console.error(`ERROR — could not create the Owner account (HTTP ${res.status}): ${msg}`)
process.exit(1)

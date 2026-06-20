#!/usr/bin/env node
// license.mjs — cross-platform license-server client for the TrenchOS bootstrap
// installer. Replaces the `curl` calls to validate-key / bind-key with built-in
// fetch (Node ≥18) so /install runs natively on Windows, macOS and Linux.
// Zero dependencies — runs before `npm install`, before the app is even cloned.
//
// Usage:
//   node scripts/license.mjs validate <LICENSE_KEY>
//   node scripts/license.mjs bind <LICENSE_KEY> <PROJECT_REF>
//
// Prints the raw JSON response from the license server on stdout (the caller
// parses it). Exit 0 on a reachable server (even valid:false), 1 on usage error,
// 2 on a network/unreachable error.

const LICENSE_SERVER = 'https://jkqmztxlobxbgwdoqpzh.supabase.co/functions/v1'

const [cmd, key, projectRef] = process.argv.slice(2)

if (cmd === 'validate' && key) {
  await call('validate-key', { key })
} else if (cmd === 'bind' && key && projectRef) {
  await call('bind-key', { key, project_ref: projectRef })
} else {
  console.error('Usage: node scripts/license.mjs validate <KEY> | bind <KEY> <PROJECT_REF>')
  process.exit(1)
}

async function call(fn, body) {
  try {
    const res = await fetch(`${LICENSE_SERVER}/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    // Pass the body straight through for the caller to parse.
    console.log(text)
    process.exit(0)
  } catch (err) {
    console.error(`NETWORK_ERROR — could not reach the license server (${err.message}).`)
    process.exit(2)
  }
}

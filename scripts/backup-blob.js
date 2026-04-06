#!/usr/bin/env node
// backup-blob.js — downloads all user data and the users list from the live app to backups/
// Usage: npm run backup

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')
const BASE_URL  = 'https://diet-app-gray-ten.vercel.app'

// Timestamped folder: backups/2026-04-07_23-40-00/
const ts      = new Date().toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19)
const OUT_DIR = path.join(ROOT, 'backups', ts)
fs.mkdirSync(OUT_DIR, { recursive: true })

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return res.json()
}

function save(filename, data) {
  const filepath = path.join(OUT_DIR, filename)
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  console.log(`  ✓ ${filename}`)
}

console.log(`\nBacking up to backups/${ts}/\n`)

// 1. Users list
let users
try {
  users = await fetchJSON(`${BASE_URL}/api/users`)
  save('users.json', users)
} catch (err) {
  console.error(`  ✗ users.json — ${err.message}`)
  process.exit(1)
}

// 2. Each user's data
let ok = 0, fail = 0
for (const { name } of users) {
  try {
    const data = await fetchJSON(`${BASE_URL}/api/data?user=${encodeURIComponent(name.toLowerCase())}`)
    if (data === null) {
      console.log(`  - ${name.toLowerCase()}.json (no data yet — skipped)`)
    } else {
      save(`${name.toLowerCase()}.json`, data)
      ok++
    }
  } catch (err) {
    console.error(`  ✗ ${name.toLowerCase()}.json — ${err.message}`)
    fail++
  }
}

console.log(`\nDone. ${ok} user(s) backed up${fail ? `, ${fail} failed` : ''}.`)
console.log(`Location: backups/${ts}/`)

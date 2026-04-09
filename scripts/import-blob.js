#!/usr/bin/env node
// import-blob.js — restores a specific user's data from a local backup file
// Usage: node scripts/import-blob.js backups/2026-04-09_12-05-31/natan.json
//    or: node scripts/import-blob.js backups/2026-04-09_12-05-31/ (all users in folder)

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL  = 'https://diet-app-gray-ten.vercel.app'

const args = process.argv.slice(2)
if (!args.length) {
  console.error('Usage: node scripts/import-blob.js <backup-file-or-folder>')
  process.exit(1)
}

const target = path.resolve(__dirname, '..', args[0])
const stat = fs.statSync(target)

const filesToImport = []

if (stat.isDirectory()) {
  // Import all user json files (not users.json)
  for (const f of fs.readdirSync(target)) {
    if (f === 'users.json') continue
    if (!f.endsWith('.json')) continue
    filesToImport.push({ file: path.join(target, f), user: f.replace('.json', '') })
  }
} else {
  const user = path.basename(target, '.json')
  filesToImport.push({ file: target, user })
}

if (!filesToImport.length) {
  console.error('No user files found to import.')
  process.exit(1)
}

console.log(`\nImporting ${filesToImport.length} file(s) to ${BASE_URL}\n`)

let ok = 0, fail = 0

for (const { file, user } of filesToImport) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const res = await fetch(`${BASE_URL}/api/data?user=${encodeURIComponent(user)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    console.log(`  ✓ ${user} — restored from ${path.basename(file)}`)
    ok++
  } catch (err) {
    console.error(`  ✗ ${user} — ${err.message}`)
    fail++
  }
}

console.log(`\nDone. ${ok} restored${fail ? `, ${fail} failed` : ''}.`)

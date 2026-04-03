#!/usr/bin/env node
// pull-bugs.js — fetches all bug reports from the live app and writes them to bugs/open/ and bugs/solved/
// Usage: npm run pull-bugs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OPEN_DIR = path.join(ROOT, 'bugs', 'open')
const SOLVED_DIR = path.join(ROOT, 'bugs', 'solved')
const API_URL = 'https://diet-app-gray-ten.vercel.app/api/bugs'

fs.mkdirSync(OPEN_DIR, { recursive: true })
fs.mkdirSync(SOLVED_DIR, { recursive: true })

console.log('Fetching bug reports...')
const res = await fetch(API_URL)
if (!res.ok) {
  console.error(`Failed to fetch bugs: ${res.status} ${res.statusText}`)
  process.exit(1)
}

const bugs = await res.json()
if (!Array.isArray(bugs) || bugs.length === 0) {
  console.log('No bug reports found.')
  process.exit(0)
}

console.log(`Found ${bugs.length} report(s). Syncing...\n`)

// Track which IDs exist in the API response
const apiIds = new Set(bugs.map(b => b.id))

// Remove local files for bugs no longer in the API
for (const dir of [OPEN_DIR, SOLVED_DIR]) {
  for (const file of fs.readdirSync(dir)) {
    const id = file.replace(/\.(md|png)$/, '')
    if (!apiIds.has(id)) {
      fs.rmSync(path.join(dir, file))
      console.log(`  Removed stale file: ${file}`)
    }
  }
}

for (const bug of bugs) {
  const dir = bug.status === 'pending' ? OPEN_DIR : SOLVED_DIR
  const otherDir = bug.status === 'pending' ? SOLVED_DIR : OPEN_DIR

  // Move files if status changed
  for (const ext of ['md', 'png']) {
    const oldPath = path.join(otherDir, `${bug.id}.${ext}`)
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, path.join(dir, `${bug.id}.${ext}`))
      console.log(`  Moved ${bug.id}.${ext} → ${bug.status === 'pending' ? 'open' : 'solved'}/`)
    }
  }

  const mdPath = path.join(dir, `${bug.id}.md`)
  const imgPath = path.join(dir, `${bug.id}.png`)

  // Download screenshot if not already saved
  if (!fs.existsSync(imgPath)) {
    try {
      const imgRes = await fetch(bug.imageUrl)
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer())
        fs.writeFileSync(imgPath, buffer)
        console.log(`  Downloaded screenshot: ${bug.id}.png`)
      } else {
        console.warn(`  Could not download screenshot for ${bug.id}: ${imgRes.status}`)
      }
    } catch (err) {
      console.warn(`  Screenshot fetch failed for ${bug.id}: ${err.message}`)
    }
  }

  // Always rewrite the markdown (status/report may have changed)
  const md = `# Bug Report: ${bug.id}

**Status:** ${bug.status}
**Reporter:** ${bug.user}
**Timestamp:** ${bug.timestamp}

## Description

${bug.report}

## Device Info

- **Viewport:** ${bug.deviceInfo?.viewportWidth} x ${bug.deviceInfo?.viewportHeight}
- **URL:** ${bug.deviceInfo?.url}
- **User Agent:** ${bug.deviceInfo?.userAgent}

## Screenshot

![Screenshot](./${bug.id}.png)
`
  fs.writeFileSync(mdPath, md)
}

// Summary
const open = bugs.filter(b => b.status === 'pending').length
const solved = bugs.filter(b => b.status !== 'pending').length
console.log(`\nDone. ${open} open, ${solved} solved.`)
console.log(`  bugs/open/   — ${open} report(s)`)
console.log(`  bugs/solved/ — ${solved} report(s)`)

import { put, list } from '@vercel/blob';

const INDEX_PATH = 'bugs/index.json'

async function getIndex(): Promise<any[]> {
  const { blobs } = await list({ prefix: INDEX_PATH })
  if (!blobs.length) return []
  const res = await fetch(blobs[0].url + `?t=${Date.now()}`) // bust CDN cache
  if (!res.ok) return []
  return res.json()
}

async function saveIndex(bugs: any[]) {
  await put(INDEX_PATH, JSON.stringify(bugs), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
    cacheControlMaxAge: 0
  })
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const bugs = await getIndex()
      return res.status(200).json(bugs)
    }

    if (req.method === 'POST') {
      const { report, deviceInfo, screenshot, user, timestamp } = req.body

      if (!report || !screenshot) {
        return res.status(400).json({ error: 'Report and screenshot are required' })
      }

      // Upload screenshot to Vercel Blob
      const screenshotBlob = await put(
        `bugs/screenshots/${Date.now()}.png`,
        Buffer.from(screenshot.split(',')[1], 'base64'),
        { access: 'public', contentType: 'image/png' }
      )

      const newBug = {
        id: crypto.randomUUID(),
        report,
        deviceInfo,
        imageUrl: screenshotBlob.url,
        user,
        timestamp,
        status: 'pending'
      }

      const bugs = await getIndex()
      bugs.unshift(newBug)
      await saveIndex(bugs)

      return res.status(200).json(newBug)
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body
      const bugs = await getIndex()
      const index = bugs.findIndex((b: any) => b.id === id)

      if (index === -1) {
        return res.status(404).json({ error: 'Bug not found' })
      }

      bugs[index].status = status
      await saveIndex(bugs)

      return res.status(200).json(bugs[index])
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Bugs API Error:', error)
    return res.status(500).json({ error: error.message })
  }
}

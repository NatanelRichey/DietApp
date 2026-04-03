import { put, list } from '@vercel/blob';

async function getUserData(user: string): Promise<any | null> {
  const { blobs } = await list({ prefix: `data/${user}.json` })
  if (!blobs.length) return null
  const res = await fetch(blobs[0].url + `?t=${Date.now()}`)
  if (!res.ok) return null
  return res.json()
}

async function saveUserData(user: string, data: any) {
  await put(`data/${user}.json`, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true
  })
}

export default async function handler(req: any, res: any) {
  const { user } = req.query

  if (!user) {
    return res.status(400).json({ error: 'User is required' })
  }

  const username = (user as string).toLowerCase()

  try {
    if (req.method === 'GET') {
      const data = await getUserData(username)
      return res.status(200).json(data || null)
    }

    if (req.method === 'POST') {
      await saveUserData(username, req.body)
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Data API Error:', error)
    return res.status(500).json({ error: error.message })
  }
}

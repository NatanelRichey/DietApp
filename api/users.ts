import { put, list } from '@vercel/blob';

const USERS_PATH = 'users/index.json'

interface AppUser {
  name: string;
  pin: string;
}

const DEFAULT_USERS: AppUser[] = [
  { name: 'Natan', pin: '9442' },
  { name: 'Simha', pin: '1994' }
]

async function getUsers(): Promise<AppUser[]> {
  const { blobs } = await list({ prefix: USERS_PATH })
  if (!blobs.length) return [...DEFAULT_USERS]
  const blobUrl = new URL(blobs[0].url)
  blobUrl.searchParams.set('t', String(Date.now()))
  const res = await fetch(blobUrl)
  if (!res.ok) return [...DEFAULT_USERS]
  return res.json()
}

async function saveUsers(users: AppUser[]) {
  await put(USERS_PATH, JSON.stringify(users), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true
  })
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const users = await getUsers()
      return res.status(200).json(users)
    }

    if (req.method === 'POST') {
      const { action, name, pin, oldName } = req.body
      let users = await getUsers()

      if (action === 'edit') {
        const targetName = oldName || name
        users = users.map(u => u.name === targetName ? { name: name || u.name, pin: pin || u.pin } : u)
      } else if (action === 'add') {
        if (!name || !pin) return res.status(400).json({ error: 'name and pin required' })
        users = [...users, { name, pin }]
      } else if (action === 'delete') {
        users = users.filter(u => u.name !== name)
      } else {
        return res.status(400).json({ error: 'Unknown action' })
      }

      await saveUsers(users)
      return res.status(200).json(users)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Users API Error:', error)
    return res.status(500).json({ error: error.message })
  }
}

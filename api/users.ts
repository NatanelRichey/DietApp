import { kv } from '@vercel/kv';

const USERS_KEY = 'app_users';

interface AppUser {
  name: string;
  pin: string;
}

const DEFAULT_USERS: AppUser[] = [
  { name: 'Natan', pin: '9442' },
  { name: 'Simha', pin: '1994' }
];

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      let users = await kv.get<AppUser[]>(USERS_KEY);
      if (!users || users.length === 0) {
        users = DEFAULT_USERS;
        await kv.set(USERS_KEY, users);
      }
      return res.status(200).json(users);
    }

    if (req.method === 'POST') {
      const { action, name, pin, oldName } = req.body;
      let users = (await kv.get<AppUser[]>(USERS_KEY)) ?? [...DEFAULT_USERS];

      if (action === 'edit') {
        const targetName = oldName || name;
        users = users.map(u => u.name === targetName ? { name: name || u.name, pin: pin || u.pin } : u);
      } else if (action === 'add') {
        if (!name || !pin) return res.status(400).json({ error: 'name and pin required' });
        users = [...users, { name, pin }];
      } else if (action === 'delete') {
        users = users.filter(u => u.name !== name);
      } else {
        return res.status(400).json({ error: 'Unknown action' });
      }

      await kv.set(USERS_KEY, users);
      return res.status(200).json(users);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Users KV Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

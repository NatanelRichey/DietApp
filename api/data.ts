import { kv } from '@vercel/kv';

export default async function handler(req: any, res: any) {
  const { user } = req.query;

  if (!user) {
    return res.status(400).json({ error: 'User is required' });
  }

  const key = `user_data:${user.toLowerCase()}`;

  try {
    if (req.method === 'GET') {
      const data = await kv.get(key);
      return res.status(200).json(data || null);
    }

    if (req.method === 'POST') {
      const data = req.body;
      await kv.set(key, data);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('KV Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

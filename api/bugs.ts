import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const bugs = await kv.get('bugs_list') || [];
      return res.status(200).json(bugs);
    }

    if (req.method === 'POST') {
      const { report, deviceInfo, screenshot, user, timestamp } = req.body;

      if (!report || !screenshot) {
        return res.status(400).json({ error: 'Report and screenshot are required' });
      }

      // 1. Upload screenshot to Vercel Blob
      // screenshot is expected to be a base64 string (data:image/png;base64,...)
      const blob = await put(`bugs/${Date.now()}.png`, Buffer.from(screenshot.split(',')[1], 'base64'), {
        access: 'public',
        contentType: 'image/png'
      });

      // 2. Prepare bug metadata
      const newBug = {
        id: crypto.randomUUID(),
        report,
        deviceInfo,
        imageUrl: blob.url,
        user,
        timestamp,
        status: 'pending'
      };

      // 3. Save to KV
      const bugs: any[] = await kv.get('bugs_list') || [];
      bugs.unshift(newBug); // Add to the beginning
      await kv.set('bugs_list', bugs);

      return res.status(200).json(newBug);
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body;
      const bugs: any[] = await kv.get('bugs_list') || [];
      const index = bugs.findIndex((b: any) => b.id === id);
      
      if (index === -1) {
        return res.status(404).json({ error: 'Bug not found' });
      }

      bugs[index].status = status;
      await kv.set('bugs_list', bugs);
      
      return res.status(200).json(bugs[index]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Bugs API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

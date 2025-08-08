import { createHash } from 'crypto'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { text } = req.body || {}
    if (typeof text !== 'string' || !text.length) {
      return res.status(400).json({ error: 'Invalid input' })
    }

    const digest = createHash('md5').update(text, 'utf8').digest('hex')
    return res.status(200).json({ digest })
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' })
  }
}



import { fetchHomeTeasers } from '../../utils/homeTeaserData'

const normalizeCurrency = (currency) => {
  const value = String(currency || 'usd').trim().toLowerCase()
  return /^[a-z]{3,8}$/.test(value) ? value : 'usd'
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const data = await fetchHomeTeasers(req, normalizeCurrency(req.query.currency))
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching homepage teasers:', error.message)
    res.status(200).json({
      dapps: [],
      tokens: [],
      nftCollections: [],
      amms: [],
      validators: [],
      amendments: []
    })
  }
}
